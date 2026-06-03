import { Router } from 'express';
import { chat } from '../controllers/proxy.controller';

const router = Router();

router.post('/chat', chat);

export default router;
