import { Request, Response } from 'express';
import { FallbackService } from '../services/fallback.service';

const fallbackService = new FallbackService();

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, provider, model, api_key } = req.body;

    if (message === undefined || message === null || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing or invalid parameter: message' });
      return;
    }

    if (api_key === undefined || api_key === null || typeof api_key !== 'string') {
      res.status(400).json({ error: 'Missing or invalid parameter: api_key' });
      return;
    }

    if (!provider || typeof provider !== 'string') {
      res.status(400).json({ error: 'Missing or invalid parameter: provider' });
      return;
    }

    if (!model || typeof model !== 'string') {
      res.status(400).json({ error: 'Missing or invalid parameter: model' });
      return;
    }

    const response = await fallbackService.executeWithFallback(req.body);
    res.json(response);
  } catch (error: any) {
    const errMsg = error.message || 'Internal proxy service error';
    res.status(502).json({ error: errMsg });
  }
}
