import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

// Create general client (used for publishing in tests and potentially general commands)
const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  }
});

// Create subscriber client
const redisSubscriber = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisSubscriber.on('error', (err) => {
  console.error('Redis Subscriber Error:', err);
});

export { redisClient, redisSubscriber };
