import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderManager } from '@app/services';
import { Provider, ValuationRequest } from '@app/providers';

describe('ProviderManager', () => {
  let manager: ProviderManager;
  let mockPrimary: Provider;
  let mockFallback: Provider;

  beforeEach(() => {
    mockPrimary = {
      name: 'Primary',
      getValuation: vi.fn(),
      getRequestUrl: vi.fn(),
    };

    mockFallback = {
      name: 'Fallback',
      getValuation: vi.fn(),
      getRequestUrl: vi.fn(),
    };

    manager = new ProviderManager(mockPrimary, mockFallback);
  });

  it('should use primary provider by default', async () => {
    const request: ValuationRequest = { vrm: 'TEST123', mileage: 50000 };
    const expectedResponse = {
      value: 10000,
      providerName: 'Primary',
      valuation: { lowerValue: 10000, upperValue: 10000 },
      requestUrl: 'http://localhost:8080',
    };

    vi.mocked(mockPrimary.getValuation).mockResolvedValue(expectedResponse);

    const result = await manager.getValuation(request);
    expect(result).toEqual(expectedResponse);
    expect(mockPrimary.getValuation).toHaveBeenCalled();
    expect(mockFallback.getValuation).not.toHaveBeenCalled();
  });

  it('should switch to fallback after 50% failures', async () => {
    const request: ValuationRequest = { vrm: 'TEST123', mileage: 50000 };

    // Make primary fail multiple times
    vi.mocked(mockPrimary.getValuation).mockRejectedValue(new Error('Failed'));

    // Try multiple requests to trigger failover
    for (let i = 0; i < 5; i++) {
      try {
        await manager.getValuation(request);
      } catch (error) {
        // Expected
      }
    }

    // Now fallback should be used
    vi.mocked(mockFallback.getValuation).mockResolvedValue({
      value: 15000,
      providerName: 'Fallback',
      valuation: { lowerValue: 15000, upperValue: 15000 },
      requestUrl: '',
    });
    const result = await manager.getValuation(request);

    expect(result.providerName).toBe('Fallback');
    expect(mockFallback.getValuation).toHaveBeenCalled();
  });
});
