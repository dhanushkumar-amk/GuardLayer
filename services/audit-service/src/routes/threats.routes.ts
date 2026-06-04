import { Router } from 'express';
import { getThreatLogs, getRecentThreats, streamThreatLogs, clearThreatLogs } from '../controllers/threats.controller';

const router = Router();

router.get('/', getThreatLogs);
router.delete('/', clearThreatLogs);
router.get('/recent', getRecentThreats);
router.get('/stream', streamThreatLogs);

export default router;
