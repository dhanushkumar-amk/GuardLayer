import { Router } from 'express';
import { getThreatLogs, getRecentThreats, streamThreatLogs, clearThreatLogs, exportThreatLogs } from '../controllers/threats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getThreatLogs);
router.get('/export', authMiddleware, exportThreatLogs);
router.delete('/', clearThreatLogs);
router.get('/recent', getRecentThreats);
router.get('/stream', streamThreatLogs);

export default router;
