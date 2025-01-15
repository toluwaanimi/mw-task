import { FastifyReply, FastifyRequest, FastifyBaseLogger } from 'fastify';
import { Logger } from 'pino';
import { VehicleValuation, ProviderLog } from '../../models';
import { ValuationService, DistributedProviderManager } from '../../services';
import { DataSource } from 'typeorm';
import {
  SuperCarValuationsProvider,
  PremiumValuationsProvider,
} from '../../providers';
import { ValuationParams, ValuationBody } from './types';

export class ValuationController {
  private readonly logger: FastifyBaseLogger;
  private readonly valuationService: ValuationService;

  constructor(logger: FastifyBaseLogger, dataSource: DataSource) {
    this.logger = logger;
    const valuationRepo = dataSource.getRepository(VehicleValuation);
    const providerLogRepo = dataSource.getRepository(ProviderLog);

    const providerManager = new DistributedProviderManager(
      new SuperCarValuationsProvider(),
      new PremiumValuationsProvider(),
      providerLogRepo,
      logger as unknown as Logger,
    );

    this.valuationService = new ValuationService(
      providerManager,
      valuationRepo,
    );
  }

  async getValuation(
    request: FastifyRequest<{ Params: ValuationParams }>,
    reply: FastifyReply,
  ) {
    const { vrm } = request.params;

    try {
      const result = await this.valuationService.getValuation(vrm);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Valuation not found') {
        return reply.code(404).send({
          message: `Valuation for VRM ${vrm} not found`,
          statusCode: 404,
        });
      }
      this.logger.error(error, 'Error getting valuation');
      return reply.code(503).send({
        message: 'Service Unavailable',
        statusCode: 503,
      });
    }
  }

  async createValuation(
    request: FastifyRequest<{ Params: ValuationParams; Body: ValuationBody }>,
    reply: FastifyReply,
  ) {
    const { vrm } = request.params;
    const { mileage } = request.body;

    try {
      const result = await this.valuationService.createValuation({
        vrm,
        mileage,
      });
      return reply.code(200).send(result);
    } catch (error) {
      this.logger.error(error, 'Error creating valuation');
      return reply.code(503).send({
        message: 'Service Unavailable',
        statusCode: 503,
      });
    }
  }
}
