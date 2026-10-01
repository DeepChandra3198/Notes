import redisClient from '../../config/redis.js';

export const cacheGet = async (key) => {
  try {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`[cache] get failed (${key}):`, err.message);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds) => {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds }); // changed
  } catch (err) {
    console.error(`[cache] set failed (${key}):`, err.message);
  }
};

export const cacheDel = async (...keys) => {
  try {
    if (keys.length) await redisClient.del(keys); // changed: array, not spread
  } catch (err) {
    console.error(`[cache] del failed (${keys}):`, err.message);
  }
};

export const cacheIncr = async (key) => {
  try {
    return await redisClient.incr(key);
  } catch (err) {
    console.error(`[cache] incr failed (${key}):`, err.message);
    return null;
  }
};

export const remember = async (key, ttlSeconds, loader) => {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const fresh = await loader();
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
};