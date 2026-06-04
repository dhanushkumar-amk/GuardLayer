import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

function loadEnv() {
  let dir = __dirname;
  while (dir && dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
      break;
    }
    dir = path.dirname(dir);
  }
}

import EventEmitter from 'events';

loadEnv();

let redisClient: any;
let redisSubscriber: any;

if (process.env.NODE_ENV === 'test') {
  class MockRedis extends EventEmitter {
    status = 'ready';
    subscribe = async () => {};
    publish = async () => {};
    quit = async () => {};
    disconnect = async () => {};
  }
  redisClient = new MockRedis();
  redisSubscriber = new MockRedis();
} else {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

  // Create general client (used for publishing in tests and potentially general commands)
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    }
  });

  // Create subscriber client
  redisSubscriber = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    }
  });

  redisClient.on('error', (err: any) => {
    console.error('Redis Client Error:', err);
  });

  redisSubscriber.on('error', (err: any) => {
    console.error('Redis Subscriber Error:', err);
  });
}

export { redisClient, redisSubscriber };
