import env from 'env-var';
import { config } from 'dotenv';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

config({ path: process.env.NODE_ENV ? `./env/.env.${process.env.NODE_ENV}` : '.env' });

// Server configuration
export const SERVER_CONFIG = {
  PORT: env.get('PORT').default(3000).asPortNumber(),
  NODE_ENV: env.get('NODE_ENV').default('development').asString(),
};

// Redis configuration
export const REDIS_CONFIG = {
  HOST: env.get('REDIS_HOST').default('localhost').asString(),
  PORT: env.get('REDIS_PORT').default(6379).asPortNumber(),
  PASSWORD: env.get('REDIS_PASSWORD').default('').asString(),
  KEY_PREFIX: env.get('REDIS_KEY_PREFIX').default('motorway:').asString(),
};

// Database configuration
export const DATABASE_CONFIG = {
  PATH: isTest 
    ? ':memory:' 
    : env.get('DATABASE_PATH').required().asString(),
};

// Cache TTL configuration (in seconds)
export const CACHE_TTL = {
  PROVIDER_HEALTH: env.get('CACHE_TTL_PROVIDER_HEALTH').default(60 * 15).asInt(), // 15 minutes
  LEADER_LOCK: env.get('CACHE_TTL_LEADER_LOCK').default(30).asInt(), // 30 seconds
  PROVIDER_STATS: env.get('CACHE_TTL_PROVIDER_STATS').default(60 * 5).asInt(), // 5 minutes
} as const;

// Cache keys configuration
export const CACHE_KEYS = {
  PROVIDER_HEALTH: env.get('CACHE_KEY_PROVIDER_HEALTH').default('provider:health:').asString(),
  LEADER_LOCK: env.get('CACHE_KEY_LEADER_LOCK').default('leader:lock').asString(),
  PROVIDER_STATS: env.get('CACHE_KEY_PROVIDER_STATS').default('provider:stats:').asString(),
} as const; 