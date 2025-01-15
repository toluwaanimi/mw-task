import Redis from 'ioredis';
import Redlock from 'redlock';
import { REDIS_CONFIG, CACHE_KEYS, CACHE_TTL } from './env.config';

const redisConfig = {
  host: REDIS_CONFIG.HOST,
  port: REDIS_CONFIG.PORT,
  password: REDIS_CONFIG.PASSWORD,
  keyPrefix: REDIS_CONFIG.KEY_PREFIX,
};

// Redis client for caching
export const redisClient = new Redis(redisConfig);

// Redis client for distributed locking (leader election)
export const lockClient = new Redis(redisConfig);
export const redlock = new Redlock([lockClient], {
  driftFactor: 0.01,
  retryCount: 0,
  retryDelay: 200,
  retryJitter: 200,
});

export { CACHE_KEYS, CACHE_TTL }; 