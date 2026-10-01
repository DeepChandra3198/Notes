import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../../config/redis.js';

const options = {
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
};

// Fallback: in-memory counter (per process). Used only while Redis isn't ready.
const memoryLimiter = rateLimit(options);

let redisLimiter = null;

// Created once, on the first request after Redis is ready
const getRedisLimiter = () => {
    if (redisLimiter) return redisLimiter;
    if (!redisClient.isReady) return null;

    try {
        redisLimiter = rateLimit({
            ...options,
            passOnStoreError: true, // Redis fails mid-request -> let the request through
            validate: { creationStack: false }, // we create it lazily on purpose, once
            store: new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
            }),
        });
    } catch (err) {
        console.error('[rate-limit] redis store init failed:', err.message);
    }
    return redisLimiter;
};

export const apiLimiter = (req, res, next) => {
    const limiter = getRedisLimiter() ?? memoryLimiter;
    return limiter(req, res, next);
};