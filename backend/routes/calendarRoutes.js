import { Router } from 'express';
import { getCalendarData } from '../controllers/calendarController.js';

const router = Router();

router.get('/', getCalendarData);

export default router;
