/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DigiData — Complete Google Apps Script                             ║
 * ║  Configured for exact sheet layout:                                 ║
 * ║   Row 1-2: Summary Statistics & Cards                              ║
 * ║   Row 3:   Headers                                                  ║
 * ║   Row 4+:  Trades (Trade #1 starts at Row 4)                        ║
 * ║                                                                     ║
 * ║  Handles BOTH directions:                                           ║
 * ║   GET  → Website fetches trades from sheet (all fields)             ║
 * ║   POST → Website pushes add/edit/delete to sheet                    ║
 * ║   TRIGGER → Sheet edits automatically push to Website               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * EXACT COLUMN MAPPING:
 *   Col 1  (A): # (Trade Number)
 *   Col 2  (B): PAIR
 *   Col 3  (C): Time
 *   Col 4  (D): Date
 *   Col 5  (E): Year             (Formula: =IF(D...))
 *   Col 6  (F): Month            (Formula: =IF(D...))
 *   Col 7  (G): Profit R
 *   Col 8  (H): Risk %
 *   Col 9  (I): $ Per Trade      (Formula: =IF(G...))
 *   Col 10 (J): Account balance  (Formula: =IF(B...))
 *   Col 11 (K): % Gain/Loss      (Formula)
 *   Col 12 (L): Drawdown         (Formula)
 *   Col 13 (M): # Of Trades      (Formula)
 *   Col 14 (N): Risk $ per position (Formula / Value)
 *   Col 15 (O): Trade Result     (TP / SL / BE)
 *   Col 16 (P): Entry Type       (Long / Short)
 *   Col 17 (Q): Trade Image (url)
 *   Col 18 (R): Day              (Formula / Day name)
 */

// ─── Configuration ────────────────────────────────────────────────────────
var SHEET_NAME     = 'Trading Journal';
var BACKEND_URL    = 'https://digidata.onrender.com';
var WEBHOOK_SECRET = 'gs_auto_sync_7x9q2p';

// Exact column indices (1-based)
var COL = {
  TRADE_NUMBER:     1,   // A: #
  PAIR:             2,   // B: PAIR
  TIME:             3,   // C: Time
  DATE:             4,   // D: Date
  YEAR:             5,   // E: Year
  MONTH:            6,   // F: Month
  PROFIT_R:         7,   // G: Profit R
  RISK_PERCENT:     8,   // H: Risk %
  DOLLAR_PER_TRADE: 9,   // I: $ Per Trade
  ACCOUNT_BAL:      10,  // J: Account balance
  GAIN_LOSS_PCT:    11,  // K: % Gain/Loss
  DRAWDOWN:         12,  // L: Drawdown
  NUM_TRADES:       13,  // M: # Of Trades
  RISK_DOLLAR:      14,  // N: Risk $ per position
  RESULT:           15,  // O: Trade Result
  ENTRY_TYPE:       16,  // P: Entry Type
  IMAGE_URL:        17,  // Q: Trade Image (url)
  DAY:              18,  // R: Day
};

// ─── GET Handler — Website pulls trades from Sheet ────────────────────────
function doGet(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    var tz    = ss.getSpreadsheetTimeZone();

    var rawData     = sheet.getDataRange().getValues();
    var displayData = sheet.getDataRange().getDisplayValues();

    if (!rawData || rawData.length < 4) {
      return jsonResponse({ success: true, count: 0, trades: [] });
    }

    // Dynamically find header row containing 'PAIR' (defaults to row 3 -> index 2)
    var headerRowIndex = 2;
    for (var r = 0; r < Math.min(rawData.length, 10); r++) {
      var rowStr = rawData[r].map(String).join(' ').toUpperCase();
      if (rowStr.indexOf('PAIR') !== -1 && (rowStr.indexOf('TIME') !== -1 || rowStr.indexOf('DATE') !== -1)) {
        headerRowIndex = r;
        break;
      }
    }

    var trades = [];

    // Trades start after the header row (Row 4 -> index 3)
    for (var i = headerRowIndex + 1; i < rawData.length; i++) {
      var rawRow     = rawData[i];
      var displayRow = displayData[i];

      // Validate PAIR cell (Col B)
      var pairVal = String(displayRow[COL.PAIR - 1] || rawRow[COL.PAIR - 1] || '').trim().toUpperCase();
      if (!pairVal || pairVal === 'PAIR' || pairVal === 'NONE' || !/^[A-Z0-9/_-]{3,12}$/.test(pairVal)) {
        continue; // Skip empty / blank template rows
      }

      // Trade Number (Col A)
      var tradeNum = parseInt(rawRow[COL.TRADE_NUMBER - 1], 10)
        || parseInt(displayRow[COL.TRADE_NUMBER - 1], 10)
        || (i - headerRowIndex);

      // Time (Col C) — use display value first to avoid any timezone shifts!
      var time = formatTime(rawRow[COL.TIME - 1], displayRow[COL.TIME - 1], tz);

      // Date (Col D)
      var date = formatDate(rawRow[COL.DATE - 1], displayRow[COL.DATE - 1], tz);

      // Profit R (Col G)
      var profitR = parseFloat(rawRow[COL.PROFIT_R - 1]);
      if (isNaN(profitR)) profitR = 0;

      // Risk % (Col H)
      var rawRisk = parseFloat(rawRow[COL.RISK_PERCENT - 1]);
      var riskPercent = 1;
      if (!isNaN(rawRisk)) {
        // e.g. 0.01 -> 1%
        riskPercent = (rawRisk > 0 && rawRisk < 1) ? Math.round(rawRisk * 10000) / 100 : rawRisk;
      }

      // Risk $ (Col N)
      var riskDollar = parseFloat(rawRow[COL.RISK_DOLLAR - 1]) || 50;

      // Account Balance (Col J)
      var rawBal = parseFloat(rawRow[COL.ACCOUNT_BAL - 1]);
      var accountBal = (!isNaN(rawBal) && rawBal > 0) ? rawBal : null;

      // Trade Result (Col O)
      var result = String(displayRow[COL.RESULT - 1] || rawRow[COL.RESULT - 1] || '').trim().toUpperCase();
      if (!result || (result !== 'TP' && result !== 'SL' && result !== 'BE')) {
        result = profitR > 0 ? 'TP' : (profitR < 0 ? 'SL' : 'BE');
      }

      // Entry Type (Col P)
      var rawEntry = String(displayRow[COL.ENTRY_TYPE - 1] || rawRow[COL.ENTRY_TYPE - 1] || 'Long').trim();
      var entryType = /^short$/i.test(rawEntry) ? 'Short' : 'Long';

      // Image URL (Col Q)
      var imageUrl = String(displayRow[COL.IMAGE_URL - 1] || rawRow[COL.IMAGE_URL - 1] || '').trim();

      trades.push({
        tradeNumber:    tradeNum,
        pair:           pairVal,
        time:           time,
        date:           date,
        profitR:        profitR,
        riskPercent:    riskPercent,
        riskDollar:     riskDollar,
        accountBalance: accountBal,
        result:         result,
        entryType:      entryType,
        imageUrl:       imageUrl,
        notes:          '',
      });
    }

    return jsonResponse({
      success: true,
      count:   trades.length,
      trades:  trades,
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── POST Handler — Website pushes add / edit / delete to Sheet ───────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(10000);
  if (!acquired) {
    return jsonResponse({ success: false, error: 'Could not acquire lock, please retry' });
  }

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || '';
    var trade  = body.trade  || {};
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var sheet  = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();

    // Find header row (defaults to 3)
    var headerRow = findHeaderRow(sheet);

    if (action === 'create' || action === 'add' || action === 'append') {
      var newTradeNum = findNextTradeNumber(sheet, headerRow);
      var targetRow   = findNextAvailableRow(sheet, headerRow);

      var pR   = parseFloat(trade.profitR) || 0;
      var rPct = parseFloat(trade.riskPercent) || 1;
      var riskDec = rPct > 0.05 ? rPct / 100 : rPct;
      var res  = String(trade.result || (pR >= 0 ? 'TP' : 'SL')).toUpperCase();
      var eTyp = /^short$/i.test(trade.entryType) ? 'Short' : 'Long';
      var dStr = trade.date ? String(trade.date).split('T')[0] : '';
      var tStr = formatTimeStr(trade.time || '12:00');
      var prevRow = targetRow - 1;

      // Col A: # (Preserve user formula if present; otherwise set upper cell + 1 formula)
      var cellTradeNum = sheet.getRange(targetRow, COL.TRADE_NUMBER);
      var existingFormulaA = cellTradeNum.getFormula();
      if (!existingFormulaA) {
        if (prevRow <= headerRow) {
          cellTradeNum.setFormula('=IF(B' + targetRow + '="","",1)');
        } else {
          cellTradeNum.setFormula('=IF(B' + targetRow + '="","",A' + prevRow + '+1)');
        }
      }
      // Col B: PAIR
      sheet.getRange(targetRow, COL.PAIR).setValue(String(trade.pair || '').toUpperCase());
      // Col C: Time
      sheet.getRange(targetRow, COL.TIME).setValue(tStr);
      // Col D: Date
      sheet.getRange(targetRow, COL.DATE).setValue(dStr);
      // Col E: Year Formula
      sheet.getRange(targetRow, COL.YEAR).setFormula('=IF(D' + targetRow + '="","",YEAR(D' + targetRow + '))');
      // Col F: Month Formula
      sheet.getRange(targetRow, COL.MONTH).setFormula('=IF(D' + targetRow + '="","",TEXT(D' + targetRow + ',"mmm"))');
      // Col G: Profit R
      sheet.getRange(targetRow, COL.PROFIT_R).setValue(pR);
      // Col H: Risk %
      sheet.getRange(targetRow, COL.RISK_PERCENT).setValue(riskDec);
      // Col I: $ Per Trade Formula
      sheet.getRange(targetRow, COL.DOLLAR_PER_TRADE).setFormula('=IF(G' + targetRow + '="","",G' + targetRow + '*N' + targetRow + ')');
      // Col J: Account balance Formula
      sheet.getRange(targetRow, COL.ACCOUNT_BAL).setFormula('=IF(B' + targetRow + '=""," ",IF(A' + targetRow + '=1,$J$2+I' + targetRow + ',J' + prevRow + '+I' + targetRow + '))');
      // Col K: % Gain/Loss Formula
      sheet.getRange(targetRow, COL.GAIN_LOSS_PCT).setFormula('=IF(J' + targetRow + '="","",IF(ISNUMBER(J' + targetRow + '),(J' + targetRow + '-$J$2)/$J$2,""))');
      // Col L: Drawdown Formula
      sheet.getRange(targetRow, COL.DRAWDOWN).setFormula('=IF(J' + targetRow + '="","",(J' + targetRow + '-MAX($J$4:J' + targetRow + '))/MAX($J$4:J' + targetRow + '))');
      // Col M: # Of Trades Formula
      sheet.getRange(targetRow, COL.NUM_TRADES).setFormula('=IF(B' + targetRow + '="","",ROW()-3)');
      // Col N: Risk $ per position Formula
      sheet.getRange(targetRow, COL.RISK_DOLLAR).setFormula('=$J$2 * H' + targetRow);
      // Col O: Trade Result
      sheet.getRange(targetRow, COL.RESULT).setValue(res);
      // Col P: Entry Type
      sheet.getRange(targetRow, COL.ENTRY_TYPE).setValue(eTyp);
      // Col Q: Trade Image (url)
      sheet.getRange(targetRow, COL.IMAGE_URL).setValue(String(trade.imageUrl || '').trim());
      // Col R: Day Formula
      sheet.getRange(targetRow, COL.DAY).setFormula('=IF(D' + targetRow + '="","",TEXT(D' + targetRow + ',"dddd"))');

      SpreadsheetApp.flush();
      var calculatedTradeNum = parseInt(sheet.getRange(targetRow, COL.TRADE_NUMBER).getValue(), 10);
      if (isNaN(calculatedTradeNum) || calculatedTradeNum <= 0) {
        var prevVal = parseInt(sheet.getRange(prevRow, COL.TRADE_NUMBER).getValue(), 10);
        calculatedTradeNum = (!isNaN(prevVal) && prevVal > 0) ? (prevVal + 1) : (prevRow - headerRow + 1);
      }

      return jsonResponse({ success: true, action: 'create', tradeNumber: calculatedTradeNum, row: targetRow });
    }

    if (action === 'update' || action === 'edit') {
      var row = findRowByTradeNumber(sheet, headerRow, trade.tradeNumber);
      if (!row) {
        return jsonResponse({ success: false, error: 'Trade #' + trade.tradeNumber + ' not found' });
      }

      if (trade.pair !== undefined) {
        sheet.getRange(row, COL.PAIR).setValue(String(trade.pair).toUpperCase());
      }
      if (trade.time !== undefined) {
        sheet.getRange(row, COL.TIME).setValue(formatTimeStr(trade.time));
      }
      if (trade.date !== undefined) {
        sheet.getRange(row, COL.DATE).setValue(String(trade.date).split('T')[0]);
      }
      if (trade.profitR !== undefined) {
        sheet.getRange(row, COL.PROFIT_R).setValue(parseFloat(trade.profitR) || 0);
      }
      if (trade.riskPercent !== undefined) {
        var r = parseFloat(trade.riskPercent) || 1;
        sheet.getRange(row, COL.RISK_PERCENT).setValue(r > 0.05 ? r / 100 : r);
      }
      if (trade.result !== undefined) {
        sheet.getRange(row, COL.RESULT).setValue(String(trade.result).toUpperCase());
      }
      if (trade.entryType !== undefined) {
        sheet.getRange(row, COL.ENTRY_TYPE).setValue(/^short$/i.test(trade.entryType) ? 'Short' : 'Long');
      }
      if (trade.imageUrl !== undefined) {
        sheet.getRange(row, COL.IMAGE_URL).setValue(String(trade.imageUrl).trim());
      }
      if (trade.riskDollar !== undefined && trade.riskDollar !== null && trade.riskDollar !== '') {
        sheet.getRange(row, COL.RISK_DOLLAR).setValue(parseFloat(trade.riskDollar));
      }
      if (trade.accountBalance !== undefined && trade.accountBalance !== null && trade.accountBalance !== '') {
        sheet.getRange(row, COL.ACCOUNT_BAL).setValue(parseFloat(trade.accountBalance));
      }

      SpreadsheetApp.flush();
      return jsonResponse({ success: true, action: 'update', tradeNumber: trade.tradeNumber, row: row });
    }

    if (action === 'delete') {
      var delRow = findRowByTradeNumber(sheet, headerRow, trade.tradeNumber);
      if (!delRow) {
        return jsonResponse({ success: false, error: 'Trade #' + trade.tradeNumber + ' not found' });
      }

      sheet.deleteRow(delRow);
      SpreadsheetApp.flush();

      // Renumber Col A from row 4 to lastRow
      renumberTrades(sheet, headerRow);

      return jsonResponse({ success: true, action: 'delete', tradeNumber: trade.tradeNumber });
    }

    return jsonResponse({ success: true, message: 'Pong / No action specified' });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

// ─── Helpers: Time & Date Formatting ──────────────────────────────────────
function formatTime(rawVal, displayVal, tz) {
  // 1. If display value looks like "8:10", "08:10", "8:10:00" -> use it directly!
  if (displayVal) {
    var match = String(displayVal).trim().match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return match[1].padStart(2, '0') + ':' + match[2];
    }
  }

  // 2. If it is a Date object, use Spreadsheet timezone
  if (rawVal instanceof Date) {
    try {
      return Utilities.formatDate(rawVal, tz || 'UTC', 'HH:mm');
    } catch (e) {
      var h = rawVal.getHours().toString().padStart(2, '0');
      var m = rawVal.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
  }

  // 3. String match fallback
  if (rawVal) {
    var m2 = String(rawVal).trim().match(/(\d{1,2}):(\d{2})/);
    if (m2) return m2[1].padStart(2, '0') + ':' + m2[2];
  }

  return '12:00';
}

function formatDate(rawVal, displayVal, tz) {
  if (rawVal instanceof Date) {
    try {
      return Utilities.formatDate(rawVal, tz || 'UTC', 'yyyy-MM-dd');
    } catch (e) {}
  }

  var s = String(displayVal || rawVal || '').trim();
  if (s.indexOf('/') !== -1) {
    var parts = s.split('/');
    if (parts.length === 3) {
      var mo = parts[0].padStart(2, '0');
      var da = parts[1].padStart(2, '0');
      var yr = parts[2];
      if (yr.length === 2) yr = '20' + yr;
      return yr + '-' + mo + '-' + da;
    }
  }
  return s;
}

function formatTimeStr(val) {
  var match = String(val || '').match(/(\d{1,2}):(\d{2})/);
  if (match) return match[1].padStart(2, '0') + ':' + match[2];
  return '12:00';
}

// ─── Helpers: Row Locators ────────────────────────────────────────────────
function findHeaderRow(sheet) {
  var data = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 10), 5).getValues();
  for (var r = 0; r < data.length; r++) {
    var rowStr = data[r].map(String).join(' ').toUpperCase();
    if (rowStr.indexOf('PAIR') !== -1) {
      return r + 1; // 1-indexed
    }
  }
  return 3;
}

function findRowByTradeNumber(sheet, headerRow, tradeNum) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return null;

  var colA = sheet.getRange(headerRow + 1, COL.TRADE_NUMBER, lastRow - headerRow, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (parseInt(colA[i][0], 10) === parseInt(tradeNum, 10)) {
      return headerRow + 1 + i;
    }
  }
  return null;
}

function findNextTradeNumber(sheet, headerRow) {
  var lastRow = sheet.getLastRow();
  var maxNum = 0;
  if (lastRow > headerRow) {
    var pairs = sheet.getRange(headerRow + 1, COL.PAIR, lastRow - headerRow, 1).getValues();
    var colA = sheet.getRange(headerRow + 1, COL.TRADE_NUMBER, lastRow - headerRow, 1).getValues();
    for (var i = 0; i < colA.length; i++) {
      if (String(pairs[i][0] || '').trim()) {
        var n = parseInt(colA[i][0], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
  }
  return maxNum + 1;
}

function findNextAvailableRow(sheet, headerRow) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return headerRow + 1;

  var pairs = sheet.getRange(headerRow + 1, COL.PAIR, lastRow - headerRow, 1).getValues();
  for (var i = 0; i < pairs.length; i++) {
    var p = String(pairs[i][0] || '').trim();
    if (!p) return headerRow + 1 + i;
  }
  return lastRow + 1;
}

function renumberTrades(sheet, headerRow) {
  var lastRow = sheet.getLastRow();
  var num = 1;
  for (var r = headerRow + 1; r <= lastRow; r++) {
    var pair = String(sheet.getRange(r, COL.PAIR).getValue() || '').trim();
    if (pair) {
      sheet.getRange(r, COL.TRADE_NUMBER).setValue(num);
      num++;
    }
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
//  AUTO-SYNC TRIGGER — on every sheet edit → pushes changes to backend
// ══════════════════════════════════════════════════════════════════════════

function onSheetEdit(e) {
  if (e && e.oldValue === e.value) return;

  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(1000);
  if (!acquired) return;

  try {
    executeSyncToBackend();
  } finally {
    lock.releaseLock();
  }
}

function executeSyncToBackend() {
  var url = BACKEND_URL + '/api/v1/trades/sheet-webhook?secret=' + WEBHOOK_SECRET;

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({ source: 'google_apps_script', timestamp: new Date().toISOString() }),
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    var result = JSON.parse(response.getContentText());

    if (code === 200 || code === 201) {
      console.log('✅ Auto-sync success: ' + (result.inserted||0) + ' added, ' + (result.updated||0) + ' updated');
    } else {
      console.error('❌ Auto-sync failed HTTP ' + code);
    }
  } catch (err) {
    console.error('Auto-sync error:', err.message);
  }
}

// ─── Run this ONCE to install the trigger ─────────────────────────────────
function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSheetEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert('✅ Auto-Sync Enabled!\n\nEvery edit in this Google Sheet will now automatically sync to your website in real-time.');
}

function manualSync() {
  executeSyncToBackend();
  SpreadsheetApp.getUi().alert('✅ Manual sync sent to website!');
}

function checkTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();
  var active = triggers.some(function(t) { return t.getHandlerFunction() === 'onSheetEdit'; });
  SpreadsheetApp.getUi().alert(active
    ? '✅ Auto-Sync is ACTIVE'
    : '⚠️ Auto-Sync NOT active — run installTrigger()');
}
