import { Provider, ValuationRequest, ValuationResponse } from '@app/providers';
import { vi } from 'vitest';

export class MockSuperCarValuationsProvider implements Provider {
  name = 'SuperCar';
  
  getRequestUrl = vi.fn().mockImplementation((vrm: string, mileage: number) => {
    return `https://mock-super-car.test/valuations/${vrm}?mileage=${mileage}`;
  });

  getValuation = vi.fn().mockImplementation(
    async (request: ValuationRequest): Promise<ValuationResponse> => {
      return {
        value: 25000,
        providerName: this.name,
        valuation: {
          lowerValue: 23000,
          upperValue: 27000,
        },
        requestUrl: this.getRequestUrl(request.vrm, request.mileage),
      };
    },
  );
} 