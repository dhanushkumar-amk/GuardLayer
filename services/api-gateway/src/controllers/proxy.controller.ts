import { Response } from 'express';
import { ApiKeyRequest } from '../middleware/apikey.middleware';

// POST /v1/chat/completions
export const chatCompletions = async (req: ApiKeyRequest, res: Response) => {
  // Config has been attached to req.config by the apikeyMiddleware
  return res.status(200).json({
    message: 'proxy coming in next phase',
    config: req.config, // Send it back to verify in tests that config is attached
  });
};
