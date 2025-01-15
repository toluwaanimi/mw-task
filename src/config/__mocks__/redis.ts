import { vi } from 'vitest';

class MockRedis {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

export const redisClient = new MockRedis();
export const lockClient = new MockRedis();

// Mock lock function that always succeeds in tests
export const acquireLock = vi.fn().mockImplementation(async () => {
  return () => Promise.resolve();
});

export const CACHE_KEYS = {
  PROVIDER_HEALTH: 'provider:health:',
  LEADER_LOCK: 'leader:lock',
  PROVIDER_STATS: 'provider:stats:',
} as const;

export const CACHE_TTL = {
  PROVIDER_HEALTH: 60 * 15, // 15 minutes
  LEADER_LOCK: 30, // 30 seconds
  PROVIDER_STATS: 60 * 5, // 5 minutes
} as const; 