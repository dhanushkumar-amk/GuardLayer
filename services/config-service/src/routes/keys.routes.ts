import { Router } from 'express';
import { createKey, listKeys, revokeKey } from '../controllers/keys.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, createKey);
router.get('/', authMiddleware, listKeys);
router.delete('/:id', authMiddleware, revokeKey);

export default router;
