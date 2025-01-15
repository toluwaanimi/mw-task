import { vi } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { VehicleValuation } from '../src/models/vehicle-valuation';
import { ProviderLog } from '../src/models/provider-log';

// Mock Redis modules
vi.mock('../src/config/redis', () => {
  return import('../src/config/__mocks__/redis');
});

// Create mock repositories
const mockValuationRepo = {
  find: vi.fn(),
  findOne: vi.fn().mockImplementation(({ where }) => {
    if (where?.vrm === 'ABC123') {
      return Promise.resolve({
        vrm: 'ABC123',
        value: 15000,
        providerName: 'SuperCar Valuations',
        mileage: 50000,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return Promise.resolve(null);
  }),
  save: vi.fn().mockImplementation((data) => Promise.resolve({
    ...data,
    id: data.id || 1,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  })),
  delete: vi.fn(),
  create: vi.fn().mockImplementation((data) => data),
  createQueryBuilder: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
    execute: vi.fn()
  }))
} as unknown as Repository<VehicleValuation>;

const mockProviderLogRepo = {
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn().mockImplementation((data) => Promise.resolve({
    ...data,
    id: data.id || 1,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  })),
  delete: vi.fn(),
  create: vi.fn().mockImplementation((data) => data),
  createQueryBuilder: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
    execute: vi.fn()
  }))
} as unknown as Repository<ProviderLog>;

// Mock TypeORM
vi.mock('typeorm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('typeorm')>();
  const decoratorFn = () => () => {};
  return {
    ...actual,
    Entity: decoratorFn,
    Column: decoratorFn,
    PrimaryColumn: decoratorFn,
    CreateDateColumn: decoratorFn,
    UpdateDateColumn: decoratorFn,
    getRepository: vi.fn().mockImplementation((entity) => {
      if (entity === VehicleValuation) {
        return mockValuationRepo;
      }
      if (entity === ProviderLog) {
        return mockProviderLogRepo;
      }
      throw new Error(`Unexpected entity: ${entity.name}`);
    }),
    DataSource: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(true),
      destroy: vi.fn().mockResolvedValue(true),
      getRepository: vi.fn().mockImplementation((entity) => {
        if (entity === VehicleValuation) {
          return mockValuationRepo;
        }
        if (entity === ProviderLog) {
          return mockProviderLogRepo;
        }
        throw new Error(`Unexpected entity: ${entity.name}`);
      })
    }))
  };
});

// Mock environment variables
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.NODE_ENV = 'test';

// Export mocks for use in tests
export const mockRepos = {
  mockValuationRepo,
  mockProviderLogRepo
}; 