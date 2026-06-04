import { Router } from 'express';
import { getConfig, getDefaultConfig, updateConfig, resetConfig } from '../controllers/config.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/default', authMiddleware, getDefaultConfig);
router.post('/reset', authMiddleware, resetConfig);
router.get('/:apiKeyId', authMiddleware, getConfig);
router.put('/:apiKeyId', authMiddleware, updateConfig);

export default router;
