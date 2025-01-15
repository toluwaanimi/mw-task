import { VehicleValuation, ProviderLog } from '@app/models';
import { DataSource } from 'typeorm';
import { DATABASE_CONFIG, SERVER_CONFIG } from './env.config';

export const getDbConfig = (isTest = false) => ({
  type: 'sqlite' as const,
  database: isTest ? ':memory:' : DATABASE_CONFIG.PATH,
  synchronize: true,
  logging: false,
  entities: [VehicleValuation, ProviderLog],
});


const isTest = SERVER_CONFIG.NODE_ENV === 'test' || Boolean(process.env.VITEST);
export const dataSource = new DataSource(getDbConfig(isTest));
