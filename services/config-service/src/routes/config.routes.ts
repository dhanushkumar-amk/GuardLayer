import { Router } from 'express';
import { getConfig, getDefaultConfig, updateConfig } from '../controllers/config.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/default', authMiddleware, getDefaultConfig);
router.get('/:apiKeyId', authMiddleware, getConfig);
router.put('/:apiKeyId', authMiddleware, updateConfig);

export default router;
