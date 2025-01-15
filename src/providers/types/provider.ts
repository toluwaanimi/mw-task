import { ValuationResponse, ValuationRequest } from './validation';

export interface Provider {
  name: string;

  getValuation(request: ValuationRequest): Promise<ValuationResponse>;

  getRequestUrl(vrm: string, mileage: number): string;
}
