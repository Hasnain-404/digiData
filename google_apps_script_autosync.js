/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DigiData — Complete Google Apps Script                             ║
 * ║  Handles BOTH directions:                                           ║
 * ║   GET  → Website fetches trades from sheet (all fields)             ║
 * ║   POST → Website pushes add/edit/delete to sheet                    ║
 * ║                                                                     ║
 * ║  DEPLOY STEPS:                                                      ║
 * ║   1. Go to Extensions → Apps Script                                 ║
 * ║   2. Replace ALL existing code with this                            ║
 * ║   3. Click 💾 Save                                                  ║
 * ║   4. Click Deploy → Manage Deployments                              ║
 * ║   5. Edit your existing deployment → New Version → Deploy           ║
 * ║   6. Then run installTrigger() once for auto-sync                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * COLUMN ORDER IN YOUR GOOGLE SHEET (must match exactly):
 *   A: Trade #  | B: PAIR | C: Time | D: Date | E: Profit R
 *   F: Risk %   | G: Account Balance | H: Trade Result
 *   I: Entry Type | J: Trade Image (url) | K: Notes
 *
 * If your sheet has a different order, adjust the column letters below.
 */

// ─── Sheet Configuration ───────────────────────────────────────────────────
var SHEET_NAME = 'Trading Journal'; // Change this to your exact sheet/tab name

// Column positions (A=1, B=2, C=3 ... adjust if your sheet is different)
var COL = {
  TRADE_NUMBER:   1,   // A
  PAIR:           2,   // B
  TIME:           3,   // C
  DATE:           4,   // D
  PROFIT_R:       5,   // E
  RISK_PERCENT:   6,   // F
  ACCOUNT_BAL:    7,   // G
  RESULT:         8,   // H
  ENTRY_TYPE:     9,   // I
  IMAGE_URL:      10,  // J
  NOTES:          11,  // K
};

// ─── Auto-sync Configuration ───────────────────────────────────────────────
var BACKEND_URL    = 'https://digidata.onrender.com';
var WEBHOOK_SECRET = 'gs_auto_sync_7x9q2p';

// ─── GET Handler — returns all trades as JSON ──────────────────────────────
function doGet(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    var data  = sheet.getDataRange().getValues();

    var trades = [];

    // Row 0 is the header row — skip it
    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // Skip completely empty rows
      if (!row[COL.PAIR - 1] && !row[COL.DATE - 1]) continue;

      var tradeNumber = row[COL.TRADE_NUMBER - 1];
      var pair        = String(row[COL.PAIR - 1] || '').trim();
      var time        = formatTime(row[COL.TIME - 1]);
      var date        = formatDate(row[COL.DATE - 1]);
      var profitR     = parseFloat(row[COL.PROFIT_R - 1]) || 0;
      var riskPct     = parseFloat(row[COL.RISK_PERCENT - 1]) || 1;
      var accountBal  = parseFloat(row[COL.ACCOUNT_BAL - 1]) || null;
      var result      = String(row[COL.RESULT - 1] || '').trim().toUpperCase();
      var entryType   = String(row[COL.ENTRY_TYPE - 1] || 'Long').trim();
      var imageUrl    = String(row[COL.IMAGE_URL - 1] || '').trim();
      var notes       = String(row[COL.NOTES - 1] || '').trim();

      // Use row index as tradeNumber if no explicit column
      if (!tradeNumber) tradeNumber = i; // row 1 = trade 1

      trades.push({
        tradeNumber:  parseInt(tradeNumber),
        pair:         pair,
        time:         time,
        date:         date,
        profitR:      profitR,
        riskPercent:  riskPct,
        accountBalance: accountBal,  // ← NOW INCLUDED
        result:       result || (profitR >= 0 ? 'TP' : 'SL'),
        entryType:    entryType,
        imageUrl:     imageUrl,
        notes:        notes,
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, trades: trades }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── POST Handler — handles append / update / delete from website ──────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;  // 'append' | 'update' | 'delete'
    var trade   = payload.trade;

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();

    if (action === 'append') {
      return appendTrade(sheet, trade);
    } else if (action === 'update') {
      return updateTrade(sheet, trade);
    } else if (action === 'delete') {
      return deleteTrade(sheet, trade);
    } else {
      // Unknown action — just return ok (e.g., auto-sync heartbeat from Apps Script)
      return jsonResponse({ success: true, message: 'No action taken' });
    }

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── Append a new trade row ────────────────────────────────────────────────
function appendTrade(sheet, trade) {
  var lastRow = sheet.getLastRow() + 1;
  var tradeNum = trade.tradeNumber || (lastRow - 1);

  sheet.getRange(lastRow, COL.TRADE_NUMBER).setValue(tradeNum);
  sheet.getRange(lastRow, COL.PAIR).setValue(trade.pair || '');
  sheet.getRange(lastRow, COL.TIME).setValue(trade.time || '');
  sheet.getRange(lastRow, COL.DATE).setValue(trade.date || '');
  sheet.getRange(lastRow, COL.PROFIT_R).setValue(trade.profitR || 0);
  sheet.getRange(lastRow, COL.RISK_PERCENT).setValue(trade.riskPercent || 1);
  sheet.getRange(lastRow, COL.ACCOUNT_BAL).setValue(trade.accountBalance || '');
  sheet.getRange(lastRow, COL.RESULT).setValue(trade.result || '');
  sheet.getRange(lastRow, COL.ENTRY_TYPE).setValue(trade.entryType || 'Long');
  sheet.getRange(lastRow, COL.IMAGE_URL).setValue(trade.imageUrl || '');
  sheet.getRange(lastRow, COL.NOTES).setValue(trade.notes || '');

  return jsonResponse({ success: true, tradeNumber: tradeNum, action: 'appended' });
}

// ─── Update an existing trade row ─────────────────────────────────────────
function updateTrade(sheet, trade) {
  var row = findRowByTradeNumber(sheet, trade.tradeNumber);
  if (!row) {
    return jsonResponse({ success: false, error: 'Trade not found: #' + trade.tradeNumber });
  }

  sheet.getRange(row, COL.PAIR).setValue(trade.pair || '');
  sheet.getRange(row, COL.TIME).setValue(trade.time || '');
  sheet.getRange(row, COL.DATE).setValue(trade.date || '');
  sheet.getRange(row, COL.PROFIT_R).setValue(trade.profitR || 0);
  sheet.getRange(row, COL.RISK_PERCENT).setValue(trade.riskPercent || 1);
  if (trade.accountBalance != null) {
    sheet.getRange(row, COL.ACCOUNT_BAL).setValue(trade.accountBalance);
  }
  sheet.getRange(row, COL.RESULT).setValue(trade.result || '');
  sheet.getRange(row, COL.ENTRY_TYPE).setValue(trade.entryType || 'Long');
  sheet.getRange(row, COL.IMAGE_URL).setValue(trade.imageUrl || '');
  sheet.getRange(row, COL.NOTES).setValue(trade.notes || '');

  return jsonResponse({ success: true, tradeNumber: trade.tradeNumber, action: 'updated' });
}

// ─── Delete a trade row ────────────────────────────────────────────────────
function deleteTrade(sheet, trade) {
  var row = findRowByTradeNumber(sheet, trade.tradeNumber);
  if (!row) {
    return jsonResponse({ success: false, error: 'Trade not found: #' + trade.tradeNumber });
  }

  sheet.deleteRow(row);

  // Re-number all remaining trades after deletion
  renumberTrades(sheet);

  return jsonResponse({ success: true, tradeNumber: trade.tradeNumber, action: 'deleted' });
}

// ─── Helper: find row by trade number ─────────────────────────────────────
function findRowByTradeNumber(sheet, tradeNumber) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (parseInt(data[i][COL.TRADE_NUMBER - 1]) === parseInt(tradeNumber)) {
      return i + 1; // 1-indexed row number
    }
  }
  return null;
}

// ─── Helper: re-number trades after a deletion ─────────────────────────────
function renumberTrades(sheet) {
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    sheet.getRange(i, COL.TRADE_NUMBER).setValue(i - 1);
  }
}

// ─── Helper: format a time value from the sheet ────────────────────────────
function formatTime(val) {
  if (!val) return '12:00';

  // If it's a Date object (Google Sheets stores times as Date)
  if (val instanceof Date) {
    var h = val.getHours().toString().padStart(2, '0');
    var m = val.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  // If it's a string like "14:30"
  var s = String(val).trim();
  var match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return match[1].padStart(2, '0') + ':' + match[2];
  }

  return '12:00';
}

// ─── Helper: format a date value from the sheet ────────────────────────────
function formatDate(val) {
  if (!val) return '';

  if (val instanceof Date) {
    var y = val.getFullYear();
    var mo = (val.getMonth() + 1).toString().padStart(2, '0');
    var d = val.getDate().toString().padStart(2, '0');
    return y + '-' + mo + '-' + d;
  }

  return String(val).trim();
}

// ─── Helper: return JSON response ──────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
//  AUTO-SYNC SECTION — fires on every sheet edit → pushes to website
// ══════════════════════════════════════════════════════════════════════════

/**
 * Called automatically on every edit.
 * Run installTrigger() once to register this.
 */
function onSheetEdit(e) {
  if (e && e.oldValue === e.value) return;

  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(500);
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
      console.log('Auto-sync: ' + (result.inserted||0) + ' added, ' + (result.updated||0) + ' updated, ' + (result.deleted||0) + ' deleted');
    } else {
      console.error('Auto-sync failed HTTP ' + code);
    }
  } catch (err) {
    console.error('Auto-sync error:', err.message);
  }
}

// ─── Run this ONCE to install the onEdit trigger ───────────────────────────
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

  SpreadsheetApp.getUi().alert('✅ Auto-Sync Enabled!\n\nEvery sheet edit now auto-syncs to the website.');
}

function manualSync() {
  executeSyncToBackend();
  SpreadsheetApp.getUi().alert('✅ Manual sync done!');
}

function checkTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();
  var active = triggers.some(function(t) { return t.getHandlerFunction() === 'onSheetEdit'; });
  SpreadsheetApp.getUi().alert(active
    ? '✅ Auto-Sync is ACTIVE'
    : '⚠️ Auto-Sync NOT active — run installTrigger()');
}
