import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/audit.controller';

const router = Router();

router.get('/', getAuditLogs);
router.get('/:requestId', getAuditLogById);

export default router;
