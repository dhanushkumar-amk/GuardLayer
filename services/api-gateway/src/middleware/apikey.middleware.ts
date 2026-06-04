import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/postgres';
import { ConfigServiceClient } from '../services/config.service';

export interface ApiKeyRequest extends Request {
  config?: any;
  apiKeyId?: string;
}

export const apiKeyMiddleware = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Missing API key',
      code: 'UNAUTHORIZED_MISSING_API_KEY',
    });
  }

  // Extract token: Support "Bearer <key>" or direct "<key>"
  let apiKey = authHeader;
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  }

  // API key validation must verify it starts with "gl-"
  if (!apiKey.startsWith('gl-')) {
    return res.status(401).json({
      error: 'Invalid API key format',
      code: 'UNAUTHORIZED_INVALID_KEY_FORMAT',
    });
  }

  try {
    // Extract key prefix (first 8 characters, e.g. "gl-f3e1b")
    const keyPrefix = apiKey.substring(0, 8);

    // Fetch keys with matching prefix
    const result = await pool.query(
      'SELECT id, key_hash, is_active FROM api_keys WHERE key_prefix = $1',
      [keyPrefix]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED_INVALID_KEY',
      });
    }

    let matchedKey: any = null;

    for (const row of result.rows) {
      const match = await bcrypt.compare(apiKey, row.key_hash);
      if (match) {
        matchedKey = row;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED_INVALID_KEY',
      });
    }

    if (!matchedKey.is_active) {
      return res.status(401).json({
        error: 'API key is revoked',
        code: 'UNAUTHORIZED_REVOKED_KEY',
      });
    }

    // Update last_used_at asynchronously with defensive check for promise/catch
    const updatePromise = pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [matchedKey.id]
    );
    if (updatePromise && typeof updatePromise.catch === 'function') {
      updatePromise.catch(err => console.error('Error updating last_used_at:', err));
    }

    // Fetch config from config-service
    const config = await ConfigServiceClient.fetchConfig(matchedKey.id);

    // Attach to request object
    req.config = config;
    req.apiKeyId = matchedKey.id;

    next();
  } catch (error: any) {
    console.error('Error validating API key:', error.message);
    if (error.message.includes('Config not found')) {
      return res.status(404).json({
        error: 'Configuration not found for this API key',
        code: 'NOT_FOUND_CONFIG',
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
