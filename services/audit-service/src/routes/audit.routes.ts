import { Router } from 'express';
import { getAuditLogs, getAuditLogById, clearAuditLogs, exportAuditLogs } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAuditLogs);
router.get('/export', authMiddleware, exportAuditLogs);
router.delete('/', clearAuditLogs);
router.get('/:requestId', getAuditLogById);

export default router;
