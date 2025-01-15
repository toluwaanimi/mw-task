import { Provider, ValuationRequest, ValuationResponse } from '@app/providers';
import { vi } from 'vitest';

export class MockPremiumValuationsProvider implements Provider {
  name = 'Premium Car';
  
  getRequestUrl = vi.fn().mockImplementation((vrm: string) => {
    return `https://mock-premium-car.test/valueCar?vrm=${vrm}`;
  });

  getValuation = vi.fn().mockImplementation(
    async (request: ValuationRequest): Promise<ValuationResponse> => {
      return {
        value: 15000,
        providerName: this.name,
        valuation: {
          lowerValue: 14000,
          upperValue: 16000,
        },
        requestUrl: this.getRequestUrl(request.vrm),
      };
    },
  );
} 