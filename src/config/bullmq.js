import IORedis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Producer (API): default retry behavior, so add() eventually throws if Redis is down
export const createQueueConnection = () => new IORedis(url);

// Consumer (worker): BullMQ REQUIRES maxRetriesPerRequest: null
export const createWorkerConnection = () =>
  new IORedis(url, { maxRetriesPerRequest: null });