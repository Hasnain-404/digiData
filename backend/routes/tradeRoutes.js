import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
  createBulkTrades,
  syncTrades,
  reconcileTrades,
  exportTradesToExcel,
  sseStream,
  syncFromGoogleSheet,
  requireAdminPin,
  verifyAdminPin,
} from '../controllers/tradeController.js';

const router = Router();

// ── Public Routes (Anyone can view & learn) ──────────────────────────────────
router.get('/stream',             sseStream);           // SSE: real-time trade update events
router.get('/',                   getTrades);           // View all trades
router.get('/export',             exportTradesToExcel); // Download trades as .xlsx
router.get('/:id',                getTradeById);        // View single trade details
router.post('/verify-pin',        verifyAdminPin);      // Verify Owner PIN

// ── Owner Protected Routes (Require Owner PIN) ────────────────────────────────
router.post('/',                  requireAdminPin, createTrade);         // Add single trade
router.put('/:id',                requireAdminPin, updateTrade);         // Edit single trade
router.delete('/:id',             requireAdminPin, deleteTrade);         // Delete single trade
router.post('/sync-google-sheet', requireAdminPin, syncFromGoogleSheet); // Pull & mirror Google Sheet
router.post('/bulk',              requireAdminPin, createBulkTrades);
router.post('/sync',              requireAdminPin, syncTrades);
router.post('/reconcile',         requireAdminPin, reconcileTrades);

export default router;
