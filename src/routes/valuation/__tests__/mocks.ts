import { vi } from 'vitest';
import { DataSource, Repository, EntityTarget, EntityMetadata, Migration } from 'typeorm';
import { VehicleValuation, ProviderLog } from '@app/models';
import { Provider } from '@app/providers';

// Repository mocks
export const mockValuationRepo: Repository<VehicleValuation> = {
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  createQueryBuilder: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
    execute: vi.fn()
  }))
} as unknown as Repository<VehicleValuation>;

export const mockProviderLogRepo: Repository<ProviderLog> = {
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  createQueryBuilder: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
    execute: vi.fn()
  }))
} as unknown as Repository<ProviderLog>;

// Create a base mock DataSource with required properties
const baseMockDataSource = {
  isInitialized: false,
  initialize: vi.fn().mockImplementation(async function() {
    baseMockDataSource.isInitialized = true;
    return mockDataSource;
  }),
  destroy: vi.fn(),
  synchronize: vi.fn(),
  dropDatabase: vi.fn(),
  runMigrations: vi.fn().mockResolvedValue([]),
  undoLastMigration: vi.fn(),
  hasMetadata: vi.fn(),
  getMetadata: vi.fn(),
  buildMetadatas: vi.fn(),
  getRepository: vi.fn().mockImplementation((entity) => {
    if (entity.name === 'VehicleValuation') {
      return mockValuationRepo;
    }
    if (entity.name === 'ProviderLog') {
      return mockProviderLogRepo;
    }
    throw new Error(`Unexpected entity: ${entity.name}`);
  }),
  name: 'default',
  options: {
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    logging: false,
    entities: [VehicleValuation, ProviderLog]
  },
  logger: {
    logQuery: vi.fn(),
    logQueryError: vi.fn(),
    logQuerySlow: vi.fn(),
    logSchemaBuild: vi.fn(),
    logMigration: vi.fn(),
    log: vi.fn()
  },
  driver: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true)
  },
  manager: {
    transaction: vi.fn(),
    query: vi.fn(),
    createQueryRunner: vi.fn()
  }
};

// Export the DataSource with proper type casting
export const mockDataSource = baseMockDataSource as unknown as DataSource;

// Provider mocks
export const mockSuperCarProvider: Provider = {
  name: 'SuperCar Valuations',
  getValuation: vi.fn(),
  getRequestUrl: vi.fn().mockImplementation((vrm, mileage) => `http://supercar.com/valuations/${vrm}?mileage=${mileage}`)
} as Provider;

export const mockPremiumProvider: Provider = {
  name: 'Premium Car Valuations',
  getValuation: vi.fn(),
  getRequestUrl: vi.fn().mockImplementation((vrm) => `http://premium.com/valueCar?vrm=${vrm}`)
} as Provider; 