import { vi, TestContext } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { VehicleValuation, ProviderLog } from '@app/models';
import { Provider } from '@app/providers';

// Extend TestContext interface to include our mocks
declare module 'vitest' {
  interface TestContext {
    mockValuationRepo: Repository<VehicleValuation>;
    mockProviderLogRepo: Repository<ProviderLog>;
    mockDataSource: DataSource;
    mockSuperCarProvider: Provider;
    mockPremiumProvider: Provider;
  }
}

// Import shared mocks
import { mockValuationRepo, mockProviderLogRepo, mockDataSource } from './mocks';

vi.mock('typeorm', () => {
  // Export mocks to global scope for test access
  const ctx = globalThis as unknown as TestContext;
  ctx.mockValuationRepo = mockValuationRepo;
  ctx.mockProviderLogRepo = mockProviderLogRepo;
  ctx.mockDataSource = mockDataSource;

  return {
    DataSource: vi.fn().mockImplementation(() => mockDataSource)
  };
});

// Mock other dependencies
vi.mock('axios');

// Mock Redis and Redlock
const mockRedisClient = {
  get: vi.fn().mockResolvedValue('0'),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  disconnect: vi.fn()
};

const mockRedlock = {
  acquire: vi.fn().mockImplementation(() => Promise.resolve({
    release: vi.fn().mockResolvedValue(true)
  }))
};

vi.mock('@app/config', async () => {
  const actual = await vi.importActual('@app/config');
  return {
    ...actual,
    redisClient: mockRedisClient,
    redlock: mockRedlock,
    CACHE_KEYS: {
      LEADER_LOCK: 'leader_lock',
      PROVIDER_HEALTH: 'provider_health'
    },
    CACHE_TTL: {
      LEADER_LOCK: 30,
      PROVIDER_HEALTH: 300
    }
  };
});

// Import shared provider mocks
import { mockSuperCarProvider, mockPremiumProvider } from './mocks';

// Mock providers
vi.mock('@app/providers/super-car/super-car-valuations.provider', () => ({
  SuperCarValuationsProvider: vi.fn().mockImplementation(() => mockSuperCarProvider)
}));

vi.mock('@app/providers/premium-car/premium-car-valuation.provider', () => ({
  PremiumValuationsProvider: vi.fn().mockImplementation(() => mockPremiumProvider)
}));

// Export providers for test access
const ctx = globalThis as unknown as TestContext;
ctx.mockSuperCarProvider = mockSuperCarProvider;
ctx.mockPremiumProvider = mockPremiumProvider; 