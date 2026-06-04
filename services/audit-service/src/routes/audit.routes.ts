import { Router } from 'express';
import { getAuditLogs, getAuditLogById, clearAuditLogs } from '../controllers/audit.controller';

const router = Router();

router.get('/', getAuditLogs);
router.delete('/', clearAuditLogs);
router.get('/:requestId', getAuditLogById);

export default router;
