import { Response, NextFunction } from 'express';
import redis from '../db/redis';
import { ApiKeyRequest } from './apikey.middleware';

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60; // 60 seconds (1 minute)

export const rateLimitMiddleware = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  const { apiKeyId } = req;

  if (!apiKeyId) {
    return res.status(500).json({
      error: 'API key ID missing from request context',
      code: 'INTERNAL_ERROR_MISSING_KEY_CONTEXT',
    });
  }

  const redisKey = `ratelimit:${apiKeyId}`;

  try {
    // Perform transaction: increment request count and get current TTL
    const result = await redis
      .multi()
      .incr(redisKey)
      .ttl(redisKey)
      .exec();

    if (!result || result.length < 2) {
      throw new Error('Redis multi command execution failed');
    }

    const [incrErr, incrResult] = result[0];
    const [ttlErr, ttlResult] = result[1];

    if (incrErr) throw incrErr;
    if (ttlErr) throw ttlErr;

    const count = incrResult as number;
    const ttl = ttlResult as number;

    // If key was just created (TTL is -1), set the expiration window
    if (ttl === -1) {
      await redis.expire(redisKey, RATE_LIMIT_WINDOW);
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - count));

    if (count > RATE_LIMIT_MAX) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'TOO_MANY_REQUESTS',
      });
    }

    next();
  } catch (error: any) {
    console.error('Rate limit error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
