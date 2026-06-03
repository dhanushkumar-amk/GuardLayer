import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/client';
import { generateApiKey, getPrefix } from '../utils/keygen';
import Redis from 'ioredis';

const router = Router();

// ioredis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

// POST /api/keys - Create a new API key
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required and must be a string' });
  }

  const client = await pool.connect();
  try {
    const rawKey = generateApiKey();
    const prefix = getPrefix(rawKey);
    const hashedKey = await bcrypt.hash(rawKey, 10);

    await client.query('BEGIN');

    // 1. Create API key row
    const keyResult = await client.query(
      `INSERT INTO api_keys (name, key_hash, key_prefix)
       VALUES ($1, $2, $3)
       RETURNING id, name, key_prefix, created_at`,
      [name, hashedKey, prefix]
    );
    const newKey = keyResult.rows[0];

    // 2. Create linked configuration row with defaults
    const configResult = await client.query(
      `INSERT INTO config (api_key_id)
       VALUES ($1)
       RETURNING id`,
      [newKey.id]
    );
    const newConfig = configResult.rows[0];

    // 3. Update API key with the config_id
    await client.query(
      `UPDATE api_keys SET config_id = $1 WHERE id = $2`,
      [newConfig.id, newKey.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      id: newKey.id,
      name: newKey.name,
      key: rawKey, // Shown once only
      key_prefix: newKey.key_prefix,
      created_at: newKey.created_at,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/keys - List all API keys
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, key_prefix, is_active, created_at, last_used_at
       FROM api_keys
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/keys/:id - Revoke API key
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE api_keys
       SET is_active = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Invalidate Redis cache
    await redis.del(`config:${id}`);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
