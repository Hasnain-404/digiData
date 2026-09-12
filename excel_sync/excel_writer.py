# -*- coding: utf-8 -*-
"""
=============================================================================
  Trading Journal Excel Sync Engine (Website -> Excel)
  ----------------------------------------------------
  Safely updates, appends, and deletes trades in Trading_Journal.xlsx
  Supports:
    1. Live Microsoft Excel COM Automation (works seamlessly when Excel is open!)
    2. openpyxl disk fallback (works when Excel is closed)
  Preserves formulas, sheet layout, and summary rows (Rows 1-3).
=============================================================================
"""

import sys
import json
import hashlib
from datetime import datetime, date, time
from pathlib import Path

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    import io
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import openpyxl

CONFIG_PATH = Path(__file__).parent / 'config.json'
HASHES_PATH = Path(__file__).parent / 'synced_hashes.json'

def get_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'excel_file_path': 'D:\\CODS\\Backtesting Dashboard\\Trading_Journal.xlsx',
        'sheet_name': 'Trading Journal'
    }

def get_hash(date_str: str, time_str: str, pair: str, profit_r: float, result: str, entry_type: str) -> str:
    key = (
        f"{str(date_str).strip()}|"
        f"{str(time_str).strip()}|"
        f"{str(pair).strip().upper()}|"
        f"{float(profit_r):.3f}|"
        f"{str(result).strip().upper()}|"
        f"{str(entry_type).strip().lower()}"
    )
    return hashlib.sha256(key.encode()).hexdigest()[:16]

def update_synced_hashes(add_hash=None, remove_hash=None):
    hashes = set()
    if HASHES_PATH.exists():
        try:
            with open(HASHES_PATH, 'r', encoding='utf-8') as f:
                hashes = set(json.load(f))
        except Exception:
            hashes = set()
    if add_hash:
        hashes.add(add_hash)
    if remove_hash and remove_hash in hashes:
        hashes.remove(remove_hash)
    with open(HASHES_PATH, 'w', encoding='utf-8') as f:
        json.dump(list(hashes), f, indent=2)


# =============================================================================
#  LIVE EXCEL COM AUTOMATION (When Excel is running on desktop)
# =============================================================================

def get_live_excel_sheet(excel_file_path: Path, sheet_name: str = None):
    """
    Attempts to connect to a running Microsoft Excel instance via COM
    using desktop window enumeration and AccessibleObjectFromWindow.
    Returns (app, workbook, worksheet) or (None, None, None).
    """
    try:
        import ctypes
        from ctypes import wintypes
        import pythoncom
        import win32com.client
        from comtypes import GUID

        hdesk = ctypes.windll.user32.OpenDesktopW('Default', 0, False, 0x0100)
        if not hdesk:
            return None, None, None

        xl_hwnds = []
        def cb(hwnd, extra):
            cls_buff = ctypes.create_unicode_buffer(256)
            ctypes.windll.user32.GetClassNameW(hwnd, cls_buff, 256)
            if cls_buff.value == 'XLMAIN':
                xl_hwnds.append(hwnd)
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        ctypes.windll.user32.EnumDesktopWindows(hdesk, WNDENUMPROC(cb), 0)

        def find_excel7(parent):
            excel7_hwnds = []
            def enum_child(h, l):
                buf = ctypes.create_unicode_buffer(256)
                ctypes.windll.user32.GetClassNameW(h, buf, 256)
                if buf.value == 'EXCEL7':
                    excel7_hwnds.append(h)
                return True
            ctypes.windll.user32.EnumChildWindows(parent, WNDENUMPROC(enum_child), 0)
            return excel7_hwnds

        OBJID_NATIVEOM = -16
        IID_IDispatch = GUID('{00020400-0000-0000-C000-000000000046}')

        app = None
        for xl_h in xl_hwnds:
            for e7 in find_excel7(xl_h):
                p_disp = ctypes.c_void_p()
                res = ctypes.windll.oleacc.AccessibleObjectFromWindow(
                    e7, OBJID_NATIVEOM, ctypes.byref(IID_IDispatch), ctypes.byref(p_disp)
                )
                if res == 0 and p_disp.value:
                    py_disp = pythoncom.ObjectFromAddress(p_disp.value, pythoncom.IID_IDispatch)
                    app = win32com.client.Dispatch(py_disp).Application
                    break
            if app:
                break

        if not app:
            return None, None, None

        # Look for the target workbook
        target_name = excel_file_path.name.lower()
        matched_wb = None
        for wb in app.Workbooks:
            if wb.Name.lower() == target_name:
                matched_wb = wb
                break

        if not matched_wb:
            return None, None, None

        # Find worksheet
        ws = None
        if sheet_name:
            try:
                ws = matched_wb.Sheets(sheet_name)
            except Exception:
                ws = matched_wb.ActiveSheet
        else:
            ws = matched_wb.ActiveSheet

        return app, matched_wb, ws

    except Exception as e:
        return None, None, None


# =============================================================================
#  APPEND TRADE
# =============================================================================

def append_trade(trade: dict, excel_path: Path = None):
    cfg = get_config()
    file_path = excel_path or Path(cfg['excel_file_path'])
    sheet_name = cfg.get('sheet_name') or 'Trading Journal'

    pair        = str(trade.get('pair', '')).strip().upper()
    time_str    = str(trade.get('time', '12:00')).strip()
    date_raw    = str(trade.get('date', '')).split('T')[0]
    profit_r    = float(trade.get('profitR', 0))
    risk_pct    = float(trade.get('riskPercent', 1))
    excel_risk  = risk_pct / 100.0 if risk_pct > 0.05 else risk_pct
    result      = str(trade.get('result', 'TP')).strip().upper()
    entry_type  = str(trade.get('entryType', 'Long')).strip()
    image_url   = str(trade.get('imageUrl', '')).strip()
    risk_dollar = trade.get('riskDollar')

    # 1. Try Live Excel via COM
    app, wb, ws = get_live_excel_sheet(file_path, sheet_name)
    if ws is not None:
        try:
            target_row = None
            # Scan from row 4 up to 500 to find first empty pair row
            for r in range(4, 500):
                val = ws.Cells(r, 2).Value
                if val is None or str(val).strip() == '':
                    target_row = r
                    break

            if target_row is None:
                target_row = ws.UsedRange.Rows.Count + 1

            trade_num = target_row - 3

            # Write trade values
            ws.Cells(target_row, 1).Value = trade_num
            ws.Cells(target_row, 2).Value = pair
            ws.Cells(target_row, 3).Value = time_str
            ws.Cells(target_row, 4).Value = date_raw

            # Preserve or set formulas
            if not ws.Cells(target_row, 5).Formula and not ws.Cells(target_row, 5).Value:
                ws.Cells(target_row, 5).Formula = f'=IF(D{target_row}="","",YEAR(D{target_row}))'
            if not ws.Cells(target_row, 6).Formula and not ws.Cells(target_row, 6).Value:
                ws.Cells(target_row, 6).Formula = f'=IF(D{target_row}="","",TEXT(D{target_row},"mmm"))'

            ws.Cells(target_row, 7).Value = profit_r
            ws.Cells(target_row, 8).Value = excel_risk

            if not ws.Cells(target_row, 9).Formula and not ws.Cells(target_row, 9).Value:
                ws.Cells(target_row, 9).Formula = f'=IF(G{target_row}="","",G{target_row}*N{target_row})'

            if not ws.Cells(target_row, 10).Formula and not ws.Cells(target_row, 10).Value:
                prev = target_row - 1
                ws.Cells(target_row, 10).Formula = f'=IF(B{target_row}=""," ",IF(A{target_row}=1,$J$2+I{target_row},J{prev}+I{target_row}))'

            if not ws.Cells(target_row, 11).Formula and not ws.Cells(target_row, 11).Value:
                ws.Cells(target_row, 11).Formula = f'=IF(J{target_row}="","",IF(ISNUMBER(J{target_row}),(J{target_row}-$J$2)/$J$2,""))'

            if not ws.Cells(target_row, 12).Formula and not ws.Cells(target_row, 12).Value:
                ws.Cells(target_row, 12).Formula = f'=IF(J{target_row}="","",(J{target_row}-MAX($J$4:J{target_row}))/MAX($J$4:J{target_row}))'

            if not ws.Cells(target_row, 13).Formula and not ws.Cells(target_row, 13).Value:
                ws.Cells(target_row, 13).Formula = f'=IF(B{target_row}="","",ROW()-3)'

            if risk_dollar is not None and str(risk_dollar).strip() != '':
                ws.Cells(target_row, 14).Value = float(risk_dollar)
            elif not ws.Cells(target_row, 14).Formula and not ws.Cells(target_row, 14).Value:
                ws.Cells(target_row, 14).Formula = f'=$J$2 * H{target_row}'

            ws.Cells(target_row, 15).Value = result
            ws.Cells(target_row, 16).Value = entry_type
            ws.Cells(target_row, 17).Value = image_url

            wb.Save()

            h = get_hash(date_raw, time_str, pair, profit_r, result, entry_type)
            update_synced_hashes(add_hash=h)

            print(f"TRADE_NUMBER:{trade_num}")
            print(f"SUCCESS: Appended trade #{trade_num} ({pair} at row {target_row}) to Excel via Live Excel COM.")
            return True

        except Exception as e:
            print(f"Warning: Live Excel COM write failed ({e}), falling back to openpyxl...", file=sys.stderr)

    # 2. Fallback to openpyxl on disk
    if not file_path.exists():
        print(f"Error: Excel file not found at {file_path}", file=sys.stderr)
        return False

    try:
        wb = openpyxl.load_workbook(str(file_path))
        ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb.active

        target_row = None
        for r in range(4, ws.max_row + 2):
            pair_val = ws.cell(row=r, column=2).value
            if pair_val is None or str(pair_val).strip() == '':
                target_row = r
                break

        if target_row is None:
            target_row = ws.max_row + 1

        trade_num = target_row - 3
        ws.cell(row=target_row, column=1, value=trade_num)
        ws.cell(row=target_row, column=2, value=pair)

        # Time
        try:
            parts = time_str.split(':')
            h, m = int(parts[0]), int(parts[1])
            s = int(parts[2]) if len(parts) > 2 else 0
            ws.cell(row=target_row, column=3, value=time(h, m, s))
        except Exception:
            ws.cell(row=target_row, column=3, value=time_str)

        # Date
        try:
            d_obj = datetime.strptime(date_raw, '%Y-%m-%d')
            ws.cell(row=target_row, column=4, value=d_obj)
        except Exception:
            ws.cell(row=target_row, column=4, value=date_raw)

        if not ws.cell(row=target_row, column=5).value:
            ws.cell(row=target_row, column=5, value=f'=IF(D{target_row}="","",YEAR(D{target_row}))')
        if not ws.cell(row=target_row, column=6).value:
            ws.cell(row=target_row, column=6, value=f'=IF(D{target_row}="","",TEXT(D{target_row},"mmm"))')

        ws.cell(row=target_row, column=7, value=profit_r)
        ws.cell(row=target_row, column=8, value=excel_risk)

        if not ws.cell(row=target_row, column=9).value:
            ws.cell(row=target_row, column=9, value=f'=IF(G{target_row}="","",G{target_row}*N{target_row})')

        if not ws.cell(row=target_row, column=10).value:
            prev = target_row - 1
            ws.cell(row=target_row, column=10, value=f'=IF(B{target_row}=""," ",IF(A{target_row}=1,$J$2+I{target_row},J{prev}+I{target_row}))')

        if not ws.cell(row=target_row, column=11).value:
            ws.cell(row=target_row, column=11, value=f'=IF(J{target_row}="","",IF(ISNUMBER(J{target_row}),(J{target_row}-$J$2)/$J$2,""))')

        if not ws.cell(row=target_row, column=12).value:
            ws.cell(row=target_row, column=12, value=f'=IF(J{target_row}="","",(J{target_row}-MAX($J$4:J{target_row}))/MAX($J$4:J{target_row}))')

        if not ws.cell(row=target_row, column=13).value:
            ws.cell(row=target_row, column=13, value=f'=IF(B{target_row}="","",ROW()-3)')

        if risk_dollar is not None and str(risk_dollar).strip() != '':
            ws.cell(row=target_row, column=14, value=float(risk_dollar))
        elif not ws.cell(row=target_row, column=14).value:
            ws.cell(row=target_row, column=14, value=f'=$J$2 * H{target_row}')

        ws.cell(row=target_row, column=15, value=result)
        ws.cell(row=target_row, column=16, value=entry_type)
        ws.cell(row=target_row, column=17, value=image_url)

        wb.save(str(file_path))
        wb.close()

        h = get_hash(date_raw, time_str, pair, profit_r, result, entry_type)
        update_synced_hashes(add_hash=h)

        print(f"TRADE_NUMBER:{trade_num}")
        print(f"SUCCESS: Appended trade #{trade_num} ({pair} at row {target_row}) to Excel via openpyxl.")
        return True

    except Exception as e:
        print(f"Error writing to Excel via openpyxl: {e}", file=sys.stderr)
        return False


# =============================================================================
#  UPDATE TRADE (In-place edit without deleting/reordering)
# =============================================================================

def update_trade(trade: dict, excel_path: Path = None):
    cfg = get_config()
    file_path = excel_path or Path(cfg['excel_file_path'])
    sheet_name = cfg.get('sheet_name') or 'Trading Journal'

    trade_num_target = trade.get('tradeNumber')
    target_pair = str(trade.get('pair', '')).strip().upper()
    target_date = str(trade.get('date', '')).split('T')[0].strip()
    target_time = str(trade.get('time', '')).strip()[:5]

    profit_r    = float(trade.get('profitR', 0)) if trade.get('profitR') is not None else 0.0
    risk_pct    = float(trade.get('riskPercent', 1))
    excel_risk  = risk_pct / 100.0 if risk_pct > 0.05 else risk_pct
    result      = str(trade.get('result', 'TP')).strip().upper()
    entry_type  = str(trade.get('entryType', 'Long')).strip()
    image_url   = str(trade.get('imageUrl', '')).strip()
    risk_dollar = trade.get('riskDollar')

    # 1. Try Live Excel COM
    app, wb, ws = get_live_excel_sheet(file_path, sheet_name)
    if ws is not None:
        try:
            found_row = None
            for r in range(4, 500):
                c1 = ws.Cells(r, 1).Value
                if trade_num_target and c1 and int(float(c1)) == int(trade_num_target):
                    found_row = r
                    break
                p_val = ws.Cells(r, 2).Value
                d_val = str(ws.Cells(r, 4).Value or '').split()[0].split('T')[0]
                t_val = str(ws.Cells(r, 3).Value or '').strip()[:5]
                if p_val and str(p_val).strip().upper() == target_pair and d_val == target_date and t_val == target_time:
                    found_row = r
                    break

            if found_row:
                ws.Cells(found_row, 2).Value = target_pair
                ws.Cells(found_row, 3).Value = target_time
                ws.Cells(found_row, 4).Value = target_date
                ws.Cells(found_row, 7).Value = profit_r
                ws.Cells(found_row, 8).Value = excel_risk
                if risk_dollar is not None and str(risk_dollar).strip() != '':
                    ws.Cells(found_row, 14).Value = float(risk_dollar)
                ws.Cells(found_row, 15).Value = result
                ws.Cells(found_row, 16).Value = entry_type
                ws.Cells(found_row, 17).Value = image_url
                wb.Save()
                print(f"SUCCESS: Updated trade at row {found_row} in Excel via Live Excel COM.")
                return True
        except Exception as e:
            print(f"Warning: Live Excel COM update failed ({e}), falling back to openpyxl...", file=sys.stderr)

    # 2. Fallback to openpyxl
    try:
        wb = openpyxl.load_workbook(str(file_path))
        ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb.active

        found_row = None
        for r in range(4, ws.max_row + 1):
            c1 = ws.cell(row=r, column=1).value
            if trade_num_target and c1 and int(float(str(c1))) == int(trade_num_target):
                found_row = r
                break
            p_val = ws.cell(row=r, column=2).value
            d_val = str(ws.cell(row=r, column=4).value or '').split()[0].split('T')[0]
            t_val = str(ws.cell(row=r, column=3).value or '').strip()[:5]
            if p_val and str(p_val).strip().upper() == target_pair and d_val == target_date and t_val == target_time:
                found_row = r
                break

        if not found_row:
            wb.close()
            print(f"WARNING: Trade not found to update in Excel: {target_pair} on {target_date}")
            return False

        ws.cell(row=found_row, column=2, value=target_pair)
        ws.cell(row=found_row, column=3, value=target_time)
        ws.cell(row=found_row, column=4, value=target_date)
        ws.cell(row=found_row, column=7, value=profit_r)
        ws.cell(row=found_row, column=8, value=excel_risk)
        if risk_dollar is not None and str(risk_dollar).strip() != '':
            ws.cell(row=found_row, column=14, value=float(risk_dollar))
        ws.cell(row=found_row, column=15, value=result)
        ws.cell(row=found_row, column=16, value=entry_type)
        ws.cell(row=found_row, column=17, value=image_url)

        wb.save(str(file_path))
        wb.close()
        print(f"SUCCESS: Updated trade at row {found_row} in Excel via openpyxl.")
        return True
    except Exception as e:
        print(f"Error updating Excel via openpyxl: {e}", file=sys.stderr)
        return False


# =============================================================================
#  DELETE TRADE
# =============================================================================

def delete_trade(trade: dict, excel_path: Path = None):
    cfg = get_config()
    file_path = excel_path or Path(cfg['excel_file_path'])
    sheet_name = cfg.get('sheet_name') or 'Trading Journal'

    trade_num_target = trade.get('tradeNumber')
    target_pair = str(trade.get('pair', '')).strip().upper()
    target_date = str(trade.get('date', '')).split('T')[0].strip()
    target_time = str(trade.get('time', '')).strip()[:5]
    target_profit_r = float(trade.get('profitR', 0)) if trade.get('profitR') is not None else None
    target_result = str(trade.get('result', '')).strip().upper() if trade.get('result') else None

    # 1. Try Live Excel COM
    app, wb, ws = get_live_excel_sheet(file_path, sheet_name)
    if ws is not None:
        try:
            found_row = None
            for r in range(4, 500):
                c1 = ws.Cells(r, 1).Value
                if trade_num_target and c1 and int(float(c1)) == int(trade_num_target):
                    found_row = r
                    break
                p_val = ws.Cells(r, 2).Value
                d_val = str(ws.Cells(r, 4).Value or '').split()[0].split('T')[0]
                t_val = str(ws.Cells(r, 3).Value or '').strip()[:5]
                if p_val and str(p_val).strip().upper() == target_pair and d_val == target_date and t_val == target_time:
                    found_row = r
                    break

            if found_row:
                ws.Rows(found_row).Delete()
                wb.Save()
                h = get_hash(target_date, target_time, target_pair, target_profit_r or 0, target_result or '', trade.get('entryType', ''))
                update_synced_hashes(remove_hash=h)
                print(f"SUCCESS: Deleted trade row {found_row} from Excel via Live Excel COM.")
                return True
        except Exception as e:
            print(f"Warning: Live Excel COM delete failed ({e}), falling back to openpyxl...", file=sys.stderr)

    # 2. Fallback to openpyxl
    if not file_path.exists():
        print(f"Error: Excel file not found at {file_path}", file=sys.stderr)
        return False

    try:
        wb = openpyxl.load_workbook(str(file_path))
        ws = wb[sheet_name] if sheet_name in wb.sheetnames else wb.active

        found_row = None
        for r in range(4, ws.max_row + 1):
            c1 = ws.cell(row=r, column=1).value
            if trade_num_target and c1 and int(float(str(c1))) == int(trade_num_target):
                found_row = r
                break
            p_val = ws.cell(row=r, column=2).value
            if not p_val:
                continue
            if str(p_val).strip().upper() != target_pair:
                continue
            d_val = ws.cell(row=r, column=4).value
            row_date = str(d_val).split()[0].split('T')[0].strip() if d_val else ''
            if row_date != target_date:
                continue
            t_val = ws.cell(row=r, column=3).value
            row_time = str(t_val).strip()[:5] if t_val else ''
            if row_time != target_time:
                continue
            found_row = r
            break

        if not found_row:
            print(f"WARNING: Trade not found in Excel: {target_pair} on {target_date} at {target_time}")
            wb.close()
            return False

        ws.delete_rows(found_row, 1)

        # Re-number column 1 (#) for subsequent rows
        for r in range(found_row, ws.max_row + 1):
            p_val = ws.cell(row=r, column=2).value
            if p_val and str(p_val).strip() != '':
                ws.cell(row=r, column=1, value=r - 3)

        wb.save(str(file_path))
        wb.close()

        h = get_hash(target_date, target_time, target_pair, target_profit_r or 0, target_result or '', trade.get('entryType', ''))
        update_synced_hashes(remove_hash=h)

        print(f"SUCCESS: Deleted trade row {found_row} from Excel via openpyxl.")
        return True
    except Exception as e:
        print(f"Error deleting trade from Excel: {e}", file=sys.stderr)
        return False


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python excel_writer.py <append|update|delete> '<trade_json>'")
        sys.exit(1)

    action = sys.argv[1].lower()
    trade_json_str = sys.argv[2]

    try:
        trade_data = json.loads(trade_json_str)
    except Exception as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if action == 'append':
        success = append_trade(trade_data)
        sys.exit(0 if success else 1)
    elif action == 'update':
        success = update_trade(trade_data)
        sys.exit(0 if success else 1)
    elif action == 'delete':
        success = delete_trade(trade_data)
        sys.exit(0 if success else 1)
    else:
        print(f"Unknown action: {action}", file=sys.stderr)
        sys.exit(1)
