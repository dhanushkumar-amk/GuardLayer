import { Router } from 'express';
import { getAnalytics, getAnalyticsSummary } from '../controllers/analytics.controller';

const router = Router();

router.get('/', getAnalytics);
router.get('/summary', getAnalyticsSummary);

export default router;
