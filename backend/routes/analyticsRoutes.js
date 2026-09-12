import { Router } from 'express';
import {
  getKPIs,
  getBestBadDays,
  getWeekdayBreakdown,
  getWeeklyPnl,
  getMonthlyReturns,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/kpis', getKPIs);
router.get('/best-bad-days', getBestBadDays);
router.get('/weekday-breakdown', getWeekdayBreakdown);
router.get('/weekly-pnl', getWeeklyPnl);
router.get('/monthly-returns', getMonthlyReturns);

export default router;
