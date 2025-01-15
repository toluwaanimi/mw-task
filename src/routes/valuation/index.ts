import { FastifyInstance } from 'fastify';
import { ValuationController } from '@app/routes/valuation/valuation.controller';
import { ValuationBody, ValuationParams } from '@app/routes/valuation/types';
import {
  valuationBodySchema,
  valuationParamsSchema,
} from '@app/routes/valuation/validation.schema';
import { dataSource } from '@app/config';

export async function valuationRoutes(fastify: FastifyInstance) {
  const controller = new ValuationController(fastify.log, dataSource);

  // Register routes
  fastify.put<{
    Params: ValuationParams;
    Body: ValuationBody;
  }>(
    '/valuations/:vrm',
    {
      schema: {
        params: valuationParamsSchema,
        body: valuationBodySchema,
      },
    },
    async (request, reply) => {
      return controller.createValuation(request, reply);
    },
  );

  fastify.get<{
    Params: ValuationParams;
  }>(
    '/valuations/:vrm',
    {
      schema: {
        params: valuationParamsSchema,
      },
    },
    async (request, reply) => {
      return controller.getValuation(request, reply);
    },
  );

  // Signal plugin completion
  await Promise.resolve();
}
