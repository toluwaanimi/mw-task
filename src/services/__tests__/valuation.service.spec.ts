import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from 'typeorm';
import { DistributedProviderManager, ValuationService } from '@app/services';
import { VehicleValuation } from '@app/models';

describe('ValuationService', () => {
  let service: ValuationService;
  let mockProviderManager: DistributedProviderManager;
  let mockValuationRepo: Repository<VehicleValuation>;

  beforeEach(() => {
    mockValuationRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn().mockImplementation((data) => Promise.resolve({
        ...data,
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      create: vi.fn()
    } as unknown as Repository<VehicleValuation>;

    mockProviderManager = {
      getValuation: vi.fn(),
      cleanup: vi.fn()
    } as unknown as DistributedProviderManager;

    service = new ValuationService(
      mockProviderManager,
      mockValuationRepo
    );
  });

  describe('getValuation', () => {
    it('should return existing valuation', async () => {
      const mockValuation = { lowestValue: 10000, highestValue: 10000, providerName: 'Test Provider', vrm: 'ABC123' };
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(mockValuation as VehicleValuation);

      const result = await service.getValuation('ABC123');
      expect(result).toEqual(mockValuation);
    });

    it('should throw if valuation not found', async () => {
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(null);

      await expect(service.getValuation('ABC123')).rejects.toThrow();
    });
  });

  describe('createValuation', () => {
    const testRequest = { vrm: 'TEST123', mileage: 50000 };

    it('should return cached valuation if exists', async () => {
      const existingValuation = { providerName: 'Cached', lowestValue: 15000, highestValue: 15000 , vrm: testRequest.vrm };
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(existingValuation as VehicleValuation);

      const result = await service.createValuation(testRequest);
      expect(result).toEqual(existingValuation);
      expect(mockProviderManager.getValuation).not.toHaveBeenCalled();
    });

    it('should call provider and save result', async () => {
      const providerResponse = { value: 12000, providerName: 'Test Provider', valuation: { lowerValue: 12000, upperValue: 12000 }, requestUrl: 'test-url' };
      
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(null);
      vi.mocked(mockProviderManager.getValuation).mockResolvedValue(providerResponse);
      vi.mocked(mockValuationRepo.save).mockResolvedValue({ vrm: testRequest.vrm, lowestValue: 12000, highestValue: 12000, providerName: 'Test Provider' } as VehicleValuation);

      const result = await service.createValuation(testRequest);
      expect(result.lowestValue).toBe(12000);
      expect(result.highestValue).toBe(12000);
      expect(result.providerName).toBe('Test Provider');
      expect(mockValuationRepo.save).toHaveBeenCalled();
    });

    it('should handle provider failure', async () => {
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(null);
      vi.mocked(mockProviderManager.getValuation).mockRejectedValue(new Error('Service Unavailable'));

      await expect(service.createValuation(testRequest)).rejects.toThrow();
    });

    it('should include provider name in response', async () => {
      const providerResponse = {
        value: 20000,
        providerName: 'Primary Provider',
        valuation: { lowerValue: 20000, upperValue: 20000 },
        requestUrl: 'test-url'
      };
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(null);
      vi.mocked(mockProviderManager.getValuation).mockResolvedValue(providerResponse);
      vi.mocked(mockValuationRepo.save).mockResolvedValue({ vrm: testRequest.vrm, lowestValue: 20000, highestValue: 20000, providerName: 'Primary Provider' } as VehicleValuation);

      const result = await service.createValuation(testRequest);
      expect(result.providerName).toBe('Primary Provider');
    });

    it('should handle missing provider name gracefully', async () => {
      const providerResponse = { value: 20000, valuation: { lowerValue: 20000, upperValue: 20000 }, requestUrl: 'test-url' }; // No provider name
      vi.mocked(mockValuationRepo.findOne).mockResolvedValue(null);
      vi.mocked(mockProviderManager.getValuation).mockResolvedValue(providerResponse);
      vi.mocked(mockValuationRepo.save).mockResolvedValue({ vrm: testRequest.vrm, lowestValue: 20000, highestValue: 20000} as VehicleValuation);

      const result = await service.createValuation(testRequest);
      expect(result.lowestValue).toBe(20000);
      expect(result.highestValue).toBe(20000);
      expect(result.providerName).toBe('Legacy Valuation');
    });
  });
}); 