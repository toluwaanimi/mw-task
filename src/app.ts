import './env';
import 'reflect-metadata';

import { fastify as Fastify, FastifyInstance } from 'fastify';
import { valuationRoutes } from './routes/valuation';
import { dataSource } from '@app/config';
import { logger } from '@app/logger';

export async function buildApp(): Promise<FastifyInstance> {
  const fastifyApp = Fastify({
    logger: logger,
    pluginTimeout: 20000,
  });

  // Initialize database connection
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    fastifyApp.log.info('Database connection initialized successfully');
  } catch (error) {
    fastifyApp.log.error('Error during Data Source initialization:', error);
    throw error;
  }

  // Add root route
  fastifyApp.get('/', async () => {
    return { hello: 'world' };
  });

  // Register routes
  await fastifyApp.register(async (instance) => {
    await valuationRoutes(instance);
  });

  await fastifyApp.ready();
  return fastifyApp;
}
