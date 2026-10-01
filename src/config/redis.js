import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  // Fail fast when disconnected instead of queueing commands
  disableOfflineQueue: true,
  socket: {
    // Retry with backoff, capped at 3s
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redisClient.on('error', (err) => console.error('[redis]', err.message));
redisClient.on('connect', () => console.log('[redis] connecting...'));
redisClient.on('ready', () => console.log('[redis] ready'));

// Don't await: the API should start even if Redis is down.
// The client keeps retrying in the background.
redisClient.connect().catch((err) =>
  console.error('[redis] initial connect failed:', err.message)
);

export default redisClient;