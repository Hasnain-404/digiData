import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import Trade, { detectSession } from '../models/Trade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Excel writer helper script path ─────────────────────────────────────────
const EXCEL_WRITER_SCRIPT = path.resolve(__dirname, '../../excel_sync/excel_writer.py');

// ─── Excel column header mapping (for export) ────────────────────────────────
const EXCEL_HEADERS = [
  'PAIR', 'Time', 'Date', 'Profit R', 'Risk %',
  'Account balance', 'Trade Result', 'Entry Type',
  'Trade Image (url)', 'Notes',
];

// Helper to run python excel_writer.py (append, update, or delete) safely
function runExcelWriter(action, trade) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(EXCEL_WRITER_SCRIPT)) {
        console.warn(`⚠️ Excel writer script not found: ${EXCEL_WRITER_SCRIPT}`);
        return resolve({ success: false, message: 'Excel writer script not found' });
      }

      const tradePayload = JSON.stringify({
        tradeNumber: trade.tradeNumber,
        pair: trade.pair,
        date: trade.date ? new Date(trade.date).toISOString().split('T')[0] : '',
        time: trade.time,
        profitR: trade.profitR,
        riskPercent: trade.riskPercent,
        riskDollar: trade.riskDollar,
        accountBalance: trade.accountBalance,
        result: trade.result,
        entryType: trade.entryType,
        imageUrl: trade.imageUrl || '',
        notes: trade.notes || '',
      });

      execFile('python', [EXCEL_WRITER_SCRIPT, action, tradePayload], (error, stdout, stderr) => {
        if (error) {
          console.warn(`⚠️ Excel writer (${action}) error:`, stderr || error.message);
          resolve({ success: false, message: (stderr || error.message).trim() });
        } else {
          console.log(`✅ Excel writer (${action}) success:`, stdout.trim());
          let tradeNum = null;
          const match = (stdout || '').match(/TRADE_NUMBER:(\d+)/);
          if (match) {
            tradeNum = parseInt(match[1], 10);
          }
          resolve({ success: true, tradeNumber: tradeNum });
        }
      });
    } catch (e) {
      console.warn(`⚠️ Excel writer execution error:`, e.message);
      resolve({ success: false, message: e.message });
    }
  });
}

// ─── Google Sheet Webhook Sync Helper ────────────────────────────────────────
async function syncToGoogleSheet(action, trade) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return null;

  try {
    const tradePayload = {
      tradeNumber: trade.tradeNumber,
      pair: trade.pair,
      date: trade.date ? new Date(trade.date).toISOString().split('T')[0] : '',
      time: trade.time,
      profitR: trade.profitR,
      riskPercent: trade.riskPercent,
      riskDollar: trade.riskDollar,
      accountBalance: trade.accountBalance,
      result: trade.result,
      entryType: trade.entryType,
      imageUrl: trade.imageUrl || '',
      notes: trade.notes || '',
    };

    console.log(`📡 Pushing to Google Sheet (${action})...`);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, trade: tradePayload }),
    });

    const data = await res.json();
    console.log(`✅ Google Sheet (${action}) response:`, data);
    return data;
  } catch (err) {
    console.warn(`⚠️ Google Sheet (${action}) error:`, err.message);
    return { success: false, error: err.message };
  }
}

// Unified sheet writer: Prioritizes Google Sheet webhook, falls back to local Excel
async function syncTradeToSheet(action, trade) {
  if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
    const gRes = await syncToGoogleSheet(action, trade);
    if (gRes && gRes.success) {
      return gRes;
    }
  }
  return runExcelWriter(action, trade);
}

// ─── Real-Time Server-Sent Events (SSE) ──────────────────────────────────────
const sseClients = new Set();

export const sseStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (res.flushHeaders) res.flushHeaders();

  res.write('data: {"type":"CONNECTED"}\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
};

export const notifyClients = (eventData = { type: 'TRADE_UPDATE' }) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
};

// ─── POST /api/v1/trades ──────────────────────────────────────────────────────
export const createTrade = async (req, res) => {
  try {
    const trade = new Trade(req.body);
    let writerRes = null;

    // ── Write back to Google Sheet / Excel automatically ────────────────────
    try {
      writerRes = await syncTradeToSheet('append', trade);
      if (writerRes && writerRes.tradeNumber) {
        trade.tradeNumber = writerRes.tradeNumber;
      }
    } catch (xlsxErr) {
      console.warn('⚠️ Could not write to sheet:', xlsxErr.message);
    }

    await trade.save(); // pre-save hooks fire here

    notifyClients({ type: 'TRADE_UPDATE', action: 'create' });
    res.status(201).json({
      success: true,
      excelSynced: Boolean(writerRes?.success),
      data: trade,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/trades?page=1&limit=20&session=London&result=TP ──────────────
export const getTrades = async (req, res) => {
  try {
    const { page = 1, limit = 20, session, result, sortBy = 'date', order = 'desc' } = req.query;

    const filter = {};
    if (session) filter.session = session;
    if (result) filter.result = result;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [trades, total] = await Promise.all([
      Trade.find(filter)
        .sort({ [sortBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Trade.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: trades,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/trades/:id ───────────────────────────────────────────────────
export const getTradeById = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }
    res.json({ success: true, data: trade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/v1/trades/:id ───────────────────────────────────────────────────
export const updateTrade = async (req, res) => {
  try {
    const oldTrade = await Trade.findById(req.params.id);
    if (!oldTrade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    if (req.body.time) {
      req.body.session = detectSession(req.body.time);
    }
    const updatedTrade = await Trade.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });

    let writerRes = null;

    // Auto-sync update to Google Sheet / Excel
    try {
      writerRes = await syncTradeToSheet('update', updatedTrade);
    } catch (xlsxErr) {
      console.warn('⚠️ Could not sync trade update to sheet:', xlsxErr.message);
    }

    notifyClients({ type: 'TRADE_UPDATE', action: 'update' });
    res.json({
      success: true,
      excelSynced: Boolean(writerRes?.success),
      message: writerRes?.success
        ? 'Trade updated successfully in database and sheet.'
        : 'Trade updated in database, but sheet sync failed.',
      data: updatedTrade,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/v1/trades/:id ────────────────────────────────────────────────
export const deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    await Trade.findByIdAndDelete(req.params.id);

    let writerRes = null;

    // Auto-sync deletion to Google Sheet / Excel
    try {
      writerRes = await syncTradeToSheet('delete', trade);
    } catch (xlsxErr) {
      console.warn('⚠️ Could not sync trade deletion to sheet:', xlsxErr.message);
    }

    notifyClients({ type: 'TRADE_UPDATE', action: 'delete' });
    res.json({
      success: true,
      excelSynced: Boolean(writerRes?.success),
      message: writerRes?.success
        ? 'Trade deleted successfully from database and sheet.'
        : 'Trade deleted from database, but sheet sync failed.',
      data: trade,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/v1/trades/bulk ──────────────────────────────────────────────────
export const createBulkTrades = async (req, res) => {
  try {
    const tradesData = Array.isArray(req.body) ? req.body : req.body.trades;
    if (!Array.isArray(tradesData) || tradesData.length === 0) {
      return res.status(400).json({ success: false, message: 'No trades provided for bulk upload' });
    }

    const savedTrades = [];
    for (const data of tradesData) {
      const trade = new Trade(data);
      await trade.save();
      savedTrades.push(trade);
    }

    res.status(201).json({
      success: true,
      count: savedTrades.length,
      data: savedTrades,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/v1/trades/sync ─────────────────────────────────────────────────
// Smart sync: checks date, time, pair, profitR, result to filter duplicates accurately.
// Used by the Excel watcher script AND the Import modal.
// Returns { inserted, skipped, duplicates[], data }
export const syncTrades = async (req, res) => {
  try {
    const tradesData = Array.isArray(req.body) ? req.body : req.body.trades;
    if (!Array.isArray(tradesData) || tradesData.length === 0) {
      return res.status(400).json({ success: false, message: 'No trades provided' });
    }

    const inserted = [];
    const updated = [];
    const duplicates = [];
    const batchSeen = new Set();

    for (const data of tradesData) {
      // Normalise date to midnight UTC for comparison
      const normalizedDate = data.date ? new Date(data.date) : null;
      if (!normalizedDate || isNaN(normalizedDate.getTime())) {
        duplicates.push({
          pair: data.pair || 'UNKNOWN',
          date: data.date,
          time: data.time,
          reason: 'Invalid date format',
        });
        continue;
      }

      const dateStr = normalizedDate.toISOString().split('T')[0];
      const timeStr = String(data.time || '12:00').trim();
      const pairStr = String(data.pair || '').trim().toUpperCase();
      const profitR = typeof data.profitR === 'number' ? data.profitR : parseFloat(data.profitR) || 0;
      const resultStr = String(data.result || (profitR >= 0 ? 'TP' : 'SL')).toUpperCase();
      const entryTypeStr = String(data.entryType || 'Long');
      const tradeNumber = data.tradeNumber ? parseInt(data.tradeNumber, 10) : null;

      // In-batch duplicate check
      const batchKey = tradeNumber
        ? `num_${tradeNumber}`
        : `${dateStr}|${timeStr}|${pairStr}|${profitR.toFixed(3)}|${resultStr}|${entryTypeStr.toLowerCase()}`;
      if (batchSeen.has(batchKey)) {
        duplicates.push({
          pair: pairStr,
          date: dateStr,
          time: timeStr,
          profitR,
          result: resultStr,
          entryType: entryTypeStr,
          reason: `Duplicate entry within batch: ${pairStr} on ${dateStr} at ${timeStr}`,
        });
        continue;
      }
      batchSeen.add(batchKey);

      // Check against DB: first by tradeNumber (if present), then by date + time + pair
      let existing = null;
      if (tradeNumber) {
        existing = await Trade.findOne({ tradeNumber });
      }

      const startOfDay = new Date(normalizedDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      if (!existing) {
        existing = await Trade.findOne({
          date: { $gte: startOfDay, $lt: endOfDay },
          time: timeStr,
          pair: pairStr,
        });
      }

      if (existing) {
        // Check if user edited the trade in Excel (RR, image URL, time, result, notes, etc.)
        const timeChanged = existing.time !== timeStr;
        const profitChanged = Math.abs(existing.profitR - profitR) > 0.001;
        const resultChanged = existing.result !== resultStr;
        const dirChanged = existing.entryType !== entryTypeStr;
        const imgChanged = data.imageUrl !== undefined && existing.imageUrl !== data.imageUrl;
        const notesChanged = data.notes !== undefined && existing.notes !== data.notes;
        const numChanged = tradeNumber && existing.tradeNumber !== tradeNumber;

        if (timeChanged || profitChanged || resultChanged || dirChanged || imgChanged || notesChanged || numChanged) {
          // UPDATE existing trade in place
          existing.time = timeStr;
          existing.date = normalizedDate;
          existing.pair = pairStr;
          existing.profitR = profitR;
          existing.result = resultStr;
          existing.entryType = entryTypeStr;
          if (tradeNumber) existing.tradeNumber = tradeNumber;
          if (data.riskPercent !== undefined) existing.riskPercent = data.riskPercent;
          if (data.riskDollar !== undefined) existing.riskDollar = data.riskDollar;
          if (data.accountBalance !== undefined) existing.accountBalance = data.accountBalance;
          if (data.imageUrl !== undefined) existing.imageUrl = data.imageUrl;
          if (data.notes !== undefined) existing.notes = data.notes;

          await existing.save();
          updated.push(existing);
          console.log(`🔄 Updated existing trade #${existing.tradeNumber || ''} (${pairStr} on ${dateStr} at ${timeStr})`);
          continue;
        }

        // Exact match with no edits -> skip duplicate
        duplicates.push({
          pair: pairStr,
          date: dateStr,
          time: timeStr,
          profitR,
          result: resultStr,
          entryType: entryTypeStr,
          reason: `Already exists in DB (unchanged): ${pairStr} on ${dateStr} at ${timeStr} (${profitR >= 0 ? '+' : ''}${profitR}R ${resultStr})`,
        });
        continue;
      }

      // Brand new trade — save it
      const newTradePayload = { ...data };
      if (tradeNumber) newTradePayload.tradeNumber = tradeNumber;
      const trade = new Trade(newTradePayload);
      await trade.save();
      inserted.push(trade);
    }

    res.status(201).json({
      success: true,
      inserted: inserted.length,
      updated: updated.length,
      skipped: duplicates.length,
      duplicates,
      data: [...inserted, ...updated],
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/v1/trades ───────────────────────────────────────────────────
export const deleteAllTrades = async (req, res) => {
  try {
    const result = await Trade.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} trades from database.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/v1/trades/export ────────────────────────────────────────────────
// Returns all trades as a downloadable .xlsx file
export const exportTradesToExcel = async (req, res) => {
  try {
    const trades = await Trade.find({}).sort({ date: 1, time: 1 }).lean();

    const rows = trades.map((t) => ({
      'PAIR': t.pair,
      'Time': t.time,
      'Date': t.date ? new Date(t.date).toISOString().split('T')[0] : '',
      'Profit R': t.profitR,
      'Risk %': `${t.riskPercent}%`,
      'Account balance': t.accountBalance,
      'Trade Result': t.result,
      'Entry Type': t.entryType,
      'Trade Image (url)': t.imageUrl || '',
      'Notes': t.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trading Journal');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', 'attachment; filename="Trading_Journal_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/v1/trades/reconcile ─────────────────────────────────────────────
// Full mirror sync: adds new trades, updates edited trades, deletes removed trades.
// Uses findOneAndUpdate (upsert) keyed on tradeNumber — NEVER creates duplicates.
export const reconcileTrades = async (req, res) => {
  try {
    const tradesData = Array.isArray(req.body) ? req.body : req.body.trades;
    if (!Array.isArray(tradesData)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: array of trades expected' });
    }

    let inserted = 0;
    let updated = 0;

    // ── Step 0: Remove any existing duplicates in DB (keep the newest one) ────
    const dupCheck = await Trade.aggregate([
      { $group: { _id: '$tradeNumber', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    for (const dup of dupCheck) {
      const [_keep, ...toRemove] = dup.ids; // keep first, delete the rest
      await Trade.deleteMany({ _id: { $in: toRemove } });
    }

    // Track which tradeNumbers came from Excel so we can delete the rest
    const incomingNumbers = new Set();

    for (let idx = 0; idx < tradesData.length; idx++) {
      const data = tradesData[idx];

      // Row # in Excel is the authoritative unique key for every trade
      const tradeNumber = data.tradeNumber ? parseInt(data.tradeNumber, 10) : (idx + 1);
      incomingNumbers.add(tradeNumber);

      const normalizedDate = data.date ? new Date(data.date) : new Date();
      const timeStr = String(data.time || '12:00').trim();
      const pairStr = String(data.pair || '').trim().toUpperCase();
      const profitR = typeof data.profitR === 'number' ? data.profitR : parseFloat(data.profitR) || 0;
      const resultStr = String(data.result || (profitR >= 0 ? 'TP' : 'SL')).toUpperCase();
      const entryTypeStr = String(data.entryType || 'Long');

      const updateFields = {
        tradeNumber,
        date: normalizedDate,
        time: timeStr,
        pair: pairStr,
        profitR,
        result: resultStr,
        entryType: entryTypeStr,
        session: data.session || detectSession(timeStr),
      };
      if (data.riskPercent !== undefined) updateFields.riskPercent = data.riskPercent;
      if (data.riskDollar !== undefined) updateFields.riskDollar = data.riskDollar;
      if (data.accountBalance !== undefined) updateFields.accountBalance = data.accountBalance;
      if (data.imageUrl !== undefined) updateFields.imageUrl = data.imageUrl;
      if (data.notes !== undefined) updateFields.notes = data.notes;

      // Atomic upsert by tradeNumber — findOneAndUpdate never races or duplicates
      const before = await Trade.findOne({ tradeNumber }).lean();
      await Trade.findOneAndUpdate(
        { tradeNumber },
        { $set: updateFields },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      if (before) updated++;
      else inserted++;
    }

    // Remove trades from DB whose row number no longer exists in Excel
    const deleteResult = await Trade.deleteMany({
      tradeNumber: { $nin: Array.from(incomingNumbers) },
    });
    const deleted = deleteResult.deletedCount;

    // Clean up legacy orphans (imported before tradeNumber was added)
    await Trade.deleteMany({ tradeNumber: { $exists: false } });
    await Trade.deleteMany({ tradeNumber: null });

    const total = await Trade.countDocuments({});

    if (inserted > 0 || updated > 0 || deleted > 0) {
      notifyClients({ type: 'TRADE_UPDATE' });
    }

    res.json({
      success: true,
      inserted,
      updated,
      deleted,
      total,
      message: `Reconciled: ${inserted} added, ${updated} updated, ${deleted} deleted. Total: ${total}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/v1/trades/sync-google-sheet ────────────────────────────────────
// Pulls all trades from Google Sheet Webhook and mirrors them into MongoDB
export const syncFromGoogleSheet = async (req, res) => {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      message: 'GOOGLE_SHEET_WEBHOOK_URL is not configured in backend environment variables.',
    });
  }

  try {
    console.log('📥 Pulling trades from Google Sheet Webhook...');
    const response = await fetch(webhookUrl);
    const data = await response.json();

    if (!data.success || !Array.isArray(data.trades)) {
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch trades from Google Sheet.',
      });
    }

    const tradesData = data.trades.map((t) => {
      // Normalize time to HH:MM
      let timeStr = String(t.time || '12:00').trim();
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        timeStr = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
      }

      // Normalize date to YYYY-MM-DD
      let dateVal = t.date;
      if (typeof dateVal === 'string' && dateVal.includes('GMT')) {
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          dateVal = parsed.toISOString().split('T')[0];
        }
      }

      return {
        tradeNumber: t.tradeNumber,
        pair: t.pair,
        date: dateVal,
        time: timeStr,
        profitR: t.profitR,
        riskPercent: t.riskPercent,
        result: t.result,
        entryType: t.entryType,
        imageUrl: t.imageUrl || '',
        notes: t.notes || '',
      };
    });

    console.log(`📊 Retrieved ${tradesData.length} trades from Google Sheet. Reconciling with database...`);
    req.body = tradesData;
    return reconcileTrades(req, res);
  } catch (err) {
    console.error('Error syncing from Google Sheet:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

