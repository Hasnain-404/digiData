import { Router } from 'express';
import {
  createTrade,
  getTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
  createBulkTrades,
  deleteAllTrades,
  syncTrades,
  reconcileTrades,
  exportTradesToExcel,
  sseStream,
} from '../controllers/tradeController.js';

const router = Router();

router.get('/stream',     sseStream);           // SSE: real-time trade update events
router.route('/').get(getTrades).post(createTrade).delete(deleteAllTrades);
router.route('/:id').get(getTradeById).put(updateTrade).delete(deleteTrade);
router.post('/bulk',      createBulkTrades);
router.post('/sync',      syncTrades);          // Smart sync with precise duplicate filter
router.post('/reconcile', reconcileTrades);     // Full mirror sync: add, update, delete
router.get('/export',     exportTradesToExcel); // Download all trades as .xlsx

export default router;
