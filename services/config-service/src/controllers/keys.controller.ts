import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db/postgres';
import redis from '../db/redis';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// POST /api/keys - Create API Key
export const createKey = async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      error: 'Name is required and must be a string',
      code: 'BAD_REQUEST_INVALID_NAME',
    });
  }

  const client = await pool.connect();
  try {
    // Generate api key in format gl-xxxxxxxxxxxxxxxx (32 hex characters after gl-)
    const rawKey = `gl-${crypto.randomBytes(16).toString('hex')}`;
    const prefix = rawKey.substring(0, 8); // e.g. "gl-f3e1b"
    const hashedKey = await bcrypt.hash(rawKey, 10);

    await client.query('BEGIN');

    // 1. Insert into api_keys
    const keyResult = await client.query(
      `INSERT INTO api_keys (name, key_hash, key_prefix)
       VALUES ($1, $2, $3)
       RETURNING id, name, key_prefix, created_at`,
      [name, hashedKey, prefix]
    );
    const newKey = keyResult.rows[0];

    // 2. Create linked default config row
    const configResult = await client.query(
      `INSERT INTO config (api_key_id)
       VALUES ($1)
       RETURNING id`,
      [newKey.id]
    );
    const newConfig = configResult.rows[0];

    // 3. Update key with reference to config
    await client.query(
      `UPDATE api_keys SET config_id = $1 WHERE id = $2`,
      [newConfig.id, newKey.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      id: newKey.id,
      name: newKey.name,
      key: rawKey, // Plain key returned once only
      key_prefix: newKey.key_prefix,
      created_at: newKey.created_at,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating API key:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  } finally {
    client.release();
  }
};

// GET /api/keys - List all keys
export const listKeys = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, key_prefix, is_active, created_at, last_used_at
       FROM api_keys
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};

// DELETE /api/keys/:id - Revoke key
export const revokeKey = async (req: AuthenticatedRequest, res: Response) => {
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
      return res.status(404).json({
        error: 'API key not found',
        code: 'NOT_FOUND_API_KEY',
      });
    }

    // Invalidate config cache for this API key
    await redis.del(`config:${id}`);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
