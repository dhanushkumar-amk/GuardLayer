import { Router, Request, Response } from 'express';
import pool from '../db/client';
import Redis from 'ioredis';

const router = Router();

// ioredis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

const CACHE_TTL = 300; // 5 minutes in seconds

// GET /api/config/:api_key_id - Get config for a key
router.get('/:api_key_id', async (req: Request, res: Response) => {
  const { api_key_id } = req.params;
  const cacheKey = `config:${api_key_id}`;

  try {
    // 1. Check Redis cache first
    const cachedConfig = await redis.get(cacheKey);
    if (cachedConfig) {
      console.log(`Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cachedConfig));
    }

    console.log(`Cache miss for ${cacheKey}. Fetching from database.`);

    // 2. Fetch from Postgres
    const result = await pool.query(
      `SELECT * FROM config WHERE api_key_id = $1`,
      [api_key_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Config not found for the given API key' });
    }

    const config = result.rows[0];

    // 3. Store in Redis
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));

    return res.json(config);
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/config/:api_key_id - Update config for a key
router.put('/:api_key_id', async (req: Request, res: Response) => {
  const { api_key_id } = req.params;
  const cacheKey = `config:${api_key_id}`;

  const {
    prompt_injection_enabled,
    prompt_injection_threshold,
    jailbreak_enabled,
    jailbreak_threshold,
    pii_scrubbing_enabled,
    pii_types,
    topic_filter_enabled,
    allowed_topics,
    toxicity_enabled,
    toxicity_threshold,
    max_tokens,
  } = req.body;

  try {
    // 1. Check if config exists first
    const checkResult = await pool.query(
      `SELECT id FROM config WHERE api_key_id = $1`,
      [api_key_id]
    );

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Config not found for the given API key' });
    }

    // 2. Update Postgres
    const result = await pool.query(
      `UPDATE config
       SET
         prompt_injection_enabled = COALESCE($2, prompt_injection_enabled),
         prompt_injection_threshold = COALESCE($3, prompt_injection_threshold),
         jailbreak_enabled = COALESCE($4, jailbreak_enabled),
         jailbreak_threshold = COALESCE($5, jailbreak_threshold),
         pii_scrubbing_enabled = COALESCE($6, pii_scrubbing_enabled),
         pii_types = COALESCE($7, pii_types::jsonb),
         topic_filter_enabled = COALESCE($8, topic_filter_enabled),
         allowed_topics = COALESCE($9, allowed_topics::jsonb),
         toxicity_enabled = COALESCE($10, toxicity_enabled),
         toxicity_threshold = COALESCE($11, toxicity_threshold),
         max_tokens = COALESCE($12, max_tokens),
         updated_at = CURRENT_TIMESTAMP
       WHERE api_key_id = $1
       RETURNING *`,
      [
        api_key_id,
        prompt_injection_enabled !== undefined ? prompt_injection_enabled : null,
        prompt_injection_threshold !== undefined ? prompt_injection_threshold : null,
        jailbreak_enabled !== undefined ? jailbreak_enabled : null,
        jailbreak_threshold !== undefined ? jailbreak_threshold : null,
        pii_scrubbing_enabled !== undefined ? pii_scrubbing_enabled : null,
        pii_types !== undefined ? JSON.stringify(pii_types) : null,
        topic_filter_enabled !== undefined ? topic_filter_enabled : null,
        allowed_topics !== undefined ? JSON.stringify(allowed_topics) : null,
        toxicity_enabled !== undefined ? toxicity_enabled : null,
        toxicity_threshold !== undefined ? toxicity_threshold : null,
        max_tokens !== undefined ? max_tokens : null,
      ]
    );

    const updatedConfig = result.rows[0];

    // 3. Invalidate Redis cache
    await redis.del(cacheKey);

    return res.json(updatedConfig);
  } catch (error: any) {
    console.error('Error updating config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
