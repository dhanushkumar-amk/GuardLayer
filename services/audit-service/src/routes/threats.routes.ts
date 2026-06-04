import { Router } from 'express';
import { getThreatLogs, getRecentThreats, streamThreatLogs } from '../controllers/threats.controller';

const router = Router();

router.get('/', getThreatLogs);
router.get('/recent', getRecentThreats);
router.get('/stream', streamThreatLogs);

export default router;
