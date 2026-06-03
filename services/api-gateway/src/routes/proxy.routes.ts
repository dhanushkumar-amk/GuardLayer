import { Router } from 'express';
import { chatCompletions } from '../controllers/proxy.controller';
import { apiKeyMiddleware } from '../middleware/apikey.middleware';
import { rateLimitMiddleware } from '../middleware/ratelimit.middleware';

const router = Router();

// Protect all /v1 routes with API key validation and Rate limiting
router.post('/chat/completions', apiKeyMiddleware, rateLimitMiddleware, chatCompletions);

export default router;
