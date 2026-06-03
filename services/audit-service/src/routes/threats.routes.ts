import { Router } from 'express';
import { getThreatLogs, getRecentThreats } from '../controllers/threats.controller';

const router = Router();

router.get('/', getThreatLogs);
router.get('/recent', getRecentThreats);

export default router;
