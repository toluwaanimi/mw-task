import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Repository } from 'typeorm';
import { Logger } from 'pino';
import { ProviderLog } from '@app/models';
import { Provider, ValuationRequest, ValuationResponse } from '@app/providers';
import { DistributedProviderManager } from '@app/services';

interface ProviderError extends Error {
  status?: number;
}

describe('DistributedProviderManager', () => {
  let manager: DistributedProviderManager;
  let mockPrimary: Required<Provider>;
  let mockFallback: Required<Provider>;
  let mockLogger: Logger;
  let mockProviderLogRepo: Repository<ProviderLog>;
  const request: ValuationRequest = { vrm: 'TEST123', mileage: 50000 };

  beforeEach(() => {
    mockPrimary = {
      name: 'Primary',
      getValuation: vi.fn(),
      getRequestUrl: vi.fn().mockReturnValue('http://primary.com/TEST123'),
    };

    mockFallback = {
      name: 'Fallback',
      getValuation: vi.fn(),
      getRequestUrl: vi.fn().mockReturnValue('http://fallback.com/TEST123'),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    } as any;

    mockProviderLogRepo = {
      save: vi
        .fn()
        .mockImplementation((data) => Promise.resolve({ ...data, id: 1 })),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    } as unknown as Repository<ProviderLog>;

    manager = new DistributedProviderManager(
      mockPrimary,
      mockFallback,
      mockProviderLogRepo,
      mockLogger,
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.cleanup();
    vi.clearAllMocks();
  });

  it('should use primary provider by default', async () => {
    const expectedResponse: ValuationResponse = {
      value: 10000,
      providerName: 'Primary',
      valuation: { lowerValue: 10000, upperValue: 10000 },
      requestUrl: 'http://primary.com/TEST123',
    };

    vi.mocked(mockPrimary.getValuation).mockResolvedValue(expectedResponse);
    vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

    const result = await manager.getValuation(request);
    expect(result).toEqual(expectedResponse);
    expect(mockPrimary.getValuation).toHaveBeenCalled();
    expect(mockFallback.getValuation).not.toHaveBeenCalled();
  });

  describe('logging functionality', () => {
    it('should log successful primary provider requests with correct URL', async () => {
      const response: ValuationResponse = {
        value: 10000,
        providerName: 'Primary',
        valuation: { lowerValue: 10000, upperValue: 10000 },
        requestUrl: 'http://primary.com/TEST123',
      };

      vi.mocked(mockPrimary.getValuation).mockResolvedValue(response);
      vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

      await manager.getValuation(request);

      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vrm: request.vrm,
          providerName: 'Primary',
          requestUrl: 'http://primary.com/TEST123',
          responseCode: 200,
          isFallbackProvider: false,
          errorMessage: undefined,
        }),
      );
    });

    it('should log failed primary provider requests with fallback success', async () => {
      const error = new Error('Primary Error') as ProviderError;
      error.status = 503;
      vi.mocked(mockPrimary.getValuation).mockRejectedValue(error);

      const fallbackResponse: ValuationResponse = {
        value: 15000,
        providerName: 'Fallback',
        valuation: { lowerValue: 15000, upperValue: 15000 },
        requestUrl: 'http://fallback.com/TEST123',
      };
      vi.mocked(mockFallback.getValuation).mockResolvedValue(fallbackResponse);
      vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

      await manager.getValuation(request);

      expect(mockProviderLogRepo.save).toHaveBeenCalledTimes(2);
      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vrm: request.vrm,
          providerName: 'Primary',
          requestUrl: 'http://primary.com/TEST123',
          responseCode: 503,
          errorMessage: 'Primary Error',
          isFallbackProvider: false,
        }),
      );
      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vrm: request.vrm,
          providerName: 'Fallback',
          requestUrl: 'http://fallback.com/TEST123',
          responseCode: 200,
          isFallbackProvider: true,
        }),
      );
    });

    it('should log both failed primary and fallback requests', async () => {
      const primaryError = new Error('Primary Error') as ProviderError;
      primaryError.status = 503;
      vi.mocked(mockPrimary.getValuation).mockRejectedValue(primaryError);

      const fallbackError = new Error('Fallback Error') as ProviderError;
      fallbackError.status = 503;
      vi.mocked(mockFallback.getValuation).mockRejectedValue(fallbackError);
      vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

      await expect(manager.getValuation(request)).rejects.toThrow();

      expect(mockProviderLogRepo.save).toHaveBeenCalledTimes(2);
      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vrm: request.vrm,
          providerName: 'Primary',
          requestUrl: 'http://primary.com/TEST123',
          responseCode: 503,
          errorMessage: 'Primary Error',
          isFallbackProvider: false,
        }),
      );
      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vrm: request.vrm,
          providerName: 'Fallback',
          requestUrl: 'http://fallback.com/TEST123',
          responseCode: 503,
          errorMessage: 'Fallback Error',
          isFallbackProvider: true,
        }),
      );
    });

    it('should include request duration in logs', async () => {
      const response: ValuationResponse = {
        value: 10000,
        providerName: 'Primary',
        valuation: { lowerValue: 10000, upperValue: 10000 },
        requestUrl: 'http://primary.com/TEST123',
      };

      vi.mocked(mockPrimary.getValuation).mockResolvedValue(response);
      vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

      await manager.getValuation(request);

      expect(mockProviderLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          requestDuration: expect.any(Number),
        }),
      );
    });
  });

  it('should maintain provider health metrics in Redis', async () => {
    const request: ValuationRequest = { vrm: 'TEST123', mileage: 50000 };

    // First request succeeds
    vi.mocked(mockPrimary.getValuation).mockResolvedValueOnce({
      value: 10000,
      providerName: 'Primary',
      valuation: { lowerValue: 10000, upperValue: 10000 },
      requestUrl: 'http://primary.com/TEST123',
    });
    vi.mocked(mockProviderLogRepo.save).mockResolvedValue({} as ProviderLog);

    await manager.getValuation(request);

    // Second request fails
    vi.mocked(mockPrimary.getValuation).mockRejectedValueOnce(
      new Error('Failed'),
    );
    vi.mocked(mockFallback.getValuation).mockResolvedValueOnce({
      value: 15000,
      providerName: 'Fallback',
      valuation: { lowerValue: 15000, upperValue: 15000 },
      requestUrl: 'http://fallback.com/TEST123',
    });

    await manager.getValuation(request);

    expect(mockProviderLogRepo.save).toHaveBeenCalledTimes(3); // Primary success, Primary failure, Fallback success
    expect(mockFallback.getValuation).toHaveBeenCalledTimes(1);
  });
});
