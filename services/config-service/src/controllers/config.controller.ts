import { Response } from 'express';
import pool from '../db/postgres';
import redis from '../db/redis';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const CACHE_TTL = 300; // 5 minutes in seconds

// GET /api/config/:apiKeyId - Get config for key
export const getConfig = async (req: AuthenticatedRequest, res: Response) => {
  const { apiKeyId } = req.params;
  const cacheKey = `config:${apiKeyId}`;

  try {
    // 1. Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    console.log(`Cache miss for ${cacheKey}. Fetching from database.`);

    // 2. Fetch from Postgres
    const result = await pool.query(
      `SELECT * FROM config WHERE api_key_id = $1`,
      [apiKeyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Configuration not found for this API key',
        code: 'NOT_FOUND_CONFIG',
      });
    }

    const config = result.rows[0];

    // 3. Store in Redis cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));

    return res.json(config);
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

// GET /api/config/default - Get global default config
export const getDefaultConfig = async (req: AuthenticatedRequest, res: Response) => {
  const cacheKey = 'config:default';
  try {
    // 1. Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // 2. Check Postgres for global default config (where api_key_id is null)
    let result = await pool.query(
      `SELECT * FROM config WHERE api_key_id IS NULL`
    );

    let config;
    if (result.rowCount === 0) {
      // Create global default config row
      const insertResult = await pool.query(
        `INSERT INTO config (api_key_id) VALUES (NULL) RETURNING *`
      );
      config = insertResult.rows[0];
    } else {
      config = result.rows[0];
    }

    // 3. Store in Redis cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));

    return res.json(config);
  } catch (error: any) {
    console.error('Error fetching default config:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

// PUT /api/config/:apiKeyId - Update config for key
export const updateConfig = async (req: AuthenticatedRequest, res: Response) => {
  const { apiKeyId } = req.params;
  const cacheKey = `config:${apiKeyId}`;

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
    // 1. Check if config exists
    const checkResult = await pool.query(
      `SELECT id FROM config WHERE api_key_id = $1`,
      [apiKeyId]
    );

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        error: 'Configuration not found for this API key',
        code: 'NOT_FOUND_CONFIG',
      });
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
        apiKeyId,
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
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
