import { Provider } from '@app/providers';
import {
  ValuationRequest,
  ValuationResponse,
  SuperCarValuationResponse,
  SuperCarValuationTransformer,
} from '@app/providers';
import { PROVIDER_CONFIG } from '@app/config';
import axios from 'axios';

export class SuperCarValuationsProvider implements Provider {
  name = 'SuperCar';
  private baseUrl = PROVIDER_CONFIG.SUPER_CAR_BASE_URL;

  getRequestUrl(vrm: string, mileage: number): string {
    return `${this.baseUrl}/valuations/${vrm}?mileage=${mileage}`;
  }

  async getValuation(request: ValuationRequest): Promise<ValuationResponse> {
    try {
      const requestUrl = this.getRequestUrl(request.vrm, request.mileage);
      const response = await axios.get<SuperCarValuationResponse>(requestUrl);

      const valuation = SuperCarValuationTransformer.transform(
        response.data,
        request.vrm,
      );

      return {
        value: valuation.midpointValue,
        providerName: this.name,
        valuation: {
          lowerValue: valuation.lowestValue,
          upperValue: valuation.highestValue,
        },
        requestUrl,
      };
    } catch (error) {
      throw error;
    }
  }
}
