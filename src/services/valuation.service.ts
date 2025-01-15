import { Repository } from 'typeorm';
import { VehicleValuation } from '../models/vehicle-valuation';
import { ValuationRequest } from '../providers/types/validation';
import { DistributedProviderManager } from './distributed-provider-manager.service';

export class ValuationService {
  constructor(
    private providerManager: DistributedProviderManager,
    private valuationRepository: Repository<VehicleValuation>,
  ) {}

  async getValuation(vrm: string): Promise<VehicleValuation> {
    const existing = await this.valuationRepository.findOne({ where: { vrm } });
    if (!existing) {
      throw new Error('Valuation not found');
    }
    return {
      ...existing,
      providerName: existing.providerName || 'Legacy Valuation',
      midpointValue: existing.midpointValue,
    };
  }

  async createValuation(request: ValuationRequest): Promise<VehicleValuation> {
    const existing = await this.valuationRepository.findOne({
      where: { vrm: request.vrm },
    });

    if (existing) {
      return {
        ...existing,
        providerName: existing.providerName || 'Legacy Valuation',
        midpointValue: existing.midpointValue,
      };
    }

    try {
      const valuation = await this.providerManager.getValuation(request);

      const valuationWithProvider = {
        vrm: request.vrm,
        lowestValue: valuation.valuation.lowerValue,
        highestValue: valuation.valuation.upperValue,
        providerName: valuation.providerName || 'Legacy Valuation',
        mileage: request.mileage,
      };

      const savedValuation = await this.valuationRepository.save(
        valuationWithProvider,
      );

      return {
        ...savedValuation,
        midpointValue: savedValuation.midpointValue,
        providerName: valuationWithProvider.providerName,
      };
    } catch (error) {
      throw error;
    }
  }
}
