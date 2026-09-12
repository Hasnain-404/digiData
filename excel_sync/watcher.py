# -*- coding: utf-8 -*-
"""
=============================================================================
  Trading Journal Excel <-> Website Watcher (Full Mirror Sync)
  -------------------------------------------------------------
  Watches Trading_Journal.xlsx for additions, edits, and deletions.
  Automatically reconciles and mirrors every change to the website.

  Features:
    - ADD: Add trade in Excel -> appears on website
    - EDIT: Edit Date, Time, RR, Image URL, Notes in Excel -> updates on website
    - DELETE: Delete trade in Excel -> deleted from website
    - Thread-safe with debounce to prevent race conditions

  Usage:
    Double-click start_watcher.bat (or run: python watcher.py)
=============================================================================
"""

import json
import os
import sys
import time
import hashlib
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

import requests
import openpyxl
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ---- Threading lock to prevent concurrent double-sync -----------------------
sync_lock = threading.Lock()

# ---- Force UTF-8 output so Windows terminal doesn't crash on special chars --
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    import io
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ---- Setup logging ----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / 'watcher.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('ExcelWatcher')

# ---- Load config ------------------------------------------------------------
CONFIG_PATH = Path(__file__).parent / 'config.json'

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config = json.load(f)

EXCEL_PATH      = Path(config['excel_file_path'])
BACKEND_URL     = config['backend_url'].rstrip('/')
POLL_INTERVAL   = int(config.get('poll_interval_seconds', 3))
SHEET_NAME      = config.get('sheet_name')        # None = first sheet
REQUEST_TIMEOUT = 60                              # seconds per request

# ---- Column aliases (case-insensitive matching) -----------------------------
COL_ALIASES = {
    'tradeNumber':    ['#', 'trade #', 'trade number', 'num', 'id'],
    'pair':           ['pair', 'symbol', 'currency', 'asset'],
    'time':           ['time', 'utc', 'entry time'],
    'date':           ['date', 'day', 'timestamp'],
    'profitR':        ['profit r', 'profitr', 'r-multiple', 'r multiple', 'pnl r'],
    'riskPercent':    ['risk %', 'riskpercent', 'risk pct', 'risk percent'],
    'riskDollar':     ['risk $ per position', 'risk$ per position', 'risk per position', 'risk$'],
    'accountBalance': ['account balance', 'balance', 'account', 'acc balance'],
    'result':         ['trade result', 'result', 'outcome', 'status', 'tp/sl'],
    'entryType':      ['entry type', 'entrytype', 'direction', 'type', 'side'],
    'imageUrl':       ['trade image (url)', 'trade image', 'image url', 'image', 'chart', 'url', 'screenshot'],
    'notes':          ['notes', 'comments', 'remark', 'description'],
}


# ---- Helpers ----------------------------------------------------------------

def parse_excel_date(val) -> str:
    """Convert any Excel date value to YYYY-MM-DD string."""
    if val is None or val == '':
        return datetime.now(timezone.utc).strftime('%Y-%m-%d')
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    for fmt in ('%Y-%m-%d', '%Y.%m.%d', '%d-%m-%Y', '%d.%m.%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def parse_excel_time(val) -> str:
    """Convert Excel time fraction or string to HH:MM."""
    if val is None or val == '':
        return '12:00'
    if isinstance(val, float) and val < 1:
        total = round(val * 24 * 60)
        return f"{total // 60:02d}:{total % 60:02d}"
    s = str(val).strip()
    import re
    m = re.search(r'(\d{1,2}):(\d{2})', s)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    return '12:00'


def get_col(row_dict: dict, field: str):
    """Find column value by any known alias."""
    aliases  = COL_ALIASES.get(field, [field])
    keys_lower = {k.strip().lower(): k for k in row_dict}
    for alias in aliases:
        found = keys_lower.get(alias.lower())
        if found and row_dict[found] not in (None, ''):
            return row_dict[found]
    return None


def row_to_trade(row_dict: dict):
    """Parse an Excel row dict into a trade payload for the backend."""
    raw_pair = get_col(row_dict, 'pair')
    if not raw_pair:
        return None
    pair = str(raw_pair).strip().upper()
    if pair in ('PAIR', 'SYMBOL', 'CURRENCY', '#', ''):
        return None

    date_str = parse_excel_date(get_col(row_dict, 'date'))
    time_str = parse_excel_time(get_col(row_dict, 'time'))

    profit_r_raw = get_col(row_dict, 'profitR')
    profit_r = float(profit_r_raw) if profit_r_raw not in (None, '') else 0.0

    acc_bal_raw    = get_col(row_dict, 'accountBalance')
    account_balance = 10000.0
    if acc_bal_raw not in (None, ''):
        try:
            account_balance = float(str(acc_bal_raw).replace(',', '').replace('$', ''))
        except ValueError:
            pass

    risk_pct_raw = get_col(row_dict, 'riskPercent')
    risk_percent = 1.0
    if risk_pct_raw not in (None, ''):
        try:
            v = float(str(risk_pct_raw).replace('%', ''))
            risk_percent = v * 100 if 0 < v < 0.1 else v
        except ValueError:
            pass

    risk_dollar = None
    risk_d_raw = get_col(row_dict, 'riskDollar')
    if risk_d_raw not in (None, ''):
        try:
            risk_dollar = float(str(risk_d_raw).replace('$', '').replace(',', ''))
        except ValueError:
            pass

    raw_result = str(get_col(row_dict, 'result') or '').upper()
    if 'SL' in raw_result or 'LOSS' in raw_result or profit_r < 0:
        result = 'SL'
    elif 'BE' in raw_result or 'BREAK' in raw_result or profit_r == 0:
        result = 'BE'
    else:
        result = 'TP'

    raw_dir    = str(get_col(row_dict, 'entryType') or '').lower()
    entry_type = 'Short' if ('short' in raw_dir or 'sell' in raw_dir) else 'Long'

    image_url = str(get_col(row_dict, 'imageUrl') or '').strip()
    notes     = str(get_col(row_dict, 'notes')    or '').strip()

    trade = {
        'pair':           pair,
        'date':           date_str,
        'time':           time_str,
        'profitR':        profit_r,
        'riskPercent':    round(risk_percent, 3),
        'accountBalance': account_balance,
        'result':         result,
        'entryType':      entry_type,
        'imageUrl':       image_url,
        'notes':          notes,
    }
    if risk_dollar is not None and risk_dollar > 0:
        trade['riskDollar'] = risk_dollar

    raw_num = row_dict.get('#') or get_col(row_dict, 'tradeNumber')
    if raw_num not in (None, ''):
        try:
            trade['tradeNumber'] = int(float(str(raw_num).strip()))
        except (ValueError, TypeError):
            pass

    return trade


# ---- Core sync function -----------------------------------------------------

def read_excel_trades() -> list:
    """Read all valid trade rows from the Excel file."""
    if not EXCEL_PATH.exists():
        log.warning(f'Excel file not found: {EXCEL_PATH}')
        return []

    try:
        wb = openpyxl.load_workbook(str(EXCEL_PATH), data_only=True, read_only=True)
        ws = wb[SHEET_NAME] if SHEET_NAME and SHEET_NAME in wb.sheetnames else wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
    except Exception as e:
        log.error(f'Failed to read Excel: {e}')
        return []

    if len(rows) < 2:
        return []

    # Find the header row (first row with PAIR / SYMBOL / CURRENCY in it)
    header_idx = 0
    for i, row in enumerate(rows):
        cells = [str(c).strip().upper() for c in row if c is not None]
        if any(c in ('PAIR', 'SYMBOL', 'CURRENCY') for c in cells):
            header_idx = i
            break

    headers = [str(c).strip() if c is not None else f'_col{ci}'
               for ci, c in enumerate(rows[header_idx])]
    trades  = []

    for row in rows[header_idx + 1:]:
        if not any(c not in (None, '') for c in row):
            continue
        row_dict = {headers[ci]: val for ci, val in enumerate(row) if ci < len(headers)}
        trade = row_to_trade(row_dict)
        if trade:
            trades.append(trade)

    return trades


def get_excel_signature() -> str:
    """Get a quick signature of the Excel file based on size and mtime."""
    try:
        stat = EXCEL_PATH.stat()
        return f"{stat.st_mtime}_{stat.st_size}"
    except Exception:
        return ""


def reconcile_excel():
    """Full mirror sync with backend: adds, updates, and deletes trades to match Excel exactly."""
    with sync_lock:
        trades = read_excel_trades()
        if not trades:
            return

        try:
            resp = requests.post(
                f'{BACKEND_URL}/trades/reconcile',
                json=trades,
                timeout=REQUEST_TIMEOUT,
            )
            data = resp.json()

            if data.get('success'):
                ins  = data.get('inserted', 0)
                upd  = data.get('updated',  0)
                dels = data.get('deleted',  0)
                tot  = data.get('total',    0)
                if ins > 0 or upd > 0 or dels > 0:
                    log.info(f'Sync done -> {ins} added, {upd} updated, {dels} deleted. Total on website: {tot}')
                else:
                    log.info(f'All {tot} trades are up to date.')
            else:
                log.error(f'Reconcile failed: {data.get("message")}')

        except requests.exceptions.ConnectionError:
            log.warning('Cannot reach backend (is the server running?). Will retry...')
        except Exception as e:
            log.error(f'Reconcile error: {e}')


# ---- File Watcher -----------------------------------------------------------

class ExcelChangeHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback  = callback
        self._last_run = 0

    def on_modified(self, event):
        if str(event.src_path) == str(EXCEL_PATH) and not event.is_directory:
            now = time.time()
            # Debounce 2 seconds: Excel writes in rapid bursts
            if now - self._last_run > 2.0:
                self._last_run = now
                self.callback()


# ---- Main -------------------------------------------------------------------

def main():
    print('=' * 60)
    print('  Trading Journal Excel Watcher - FULL TWO-WAY MIRROR')
    print(f'  File  : {EXCEL_PATH}')
    print(f'  Server: {BACKEND_URL}')
    print(f'  Poll  : every {POLL_INTERVAL}s')
    print('=' * 60)

    # Initial sync on startup
    log.info('Running initial reconciliation with backend...')
    reconcile_excel()

    last_sig = get_excel_signature()

    # Set up file watcher for immediate detection on save
    def on_file_changed():
        nonlocal last_sig
        current_sig = get_excel_signature()
        if current_sig != last_sig:
            last_sig = current_sig
            log.info('Excel file changed -- syncing changes to website...')
            reconcile_excel()

    observer = Observer()
    handler  = ExcelChangeHandler(on_file_changed)
    observer.schedule(handler, str(EXCEL_PATH.parent), recursive=False)
    observer.start()

    log.info('Watching for changes... (Ctrl+C to stop)')

    try:
        while True:
            time.sleep(POLL_INTERVAL)
            current_sig = get_excel_signature()
            if current_sig != last_sig:
                last_sig = current_sig
                log.info('Detected Excel modification -- syncing...')
                reconcile_excel()
    except KeyboardInterrupt:
        log.info('Stopping watcher...')
        observer.stop()

    observer.join()
    log.info('Watcher stopped cleanly.')


if __name__ == '__main__':
    main()
