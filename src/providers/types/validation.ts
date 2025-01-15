export interface ValuationRequest {
  vrm: string;
  mileage: number;
}

export interface Valuation {
  lowerValue: number;
  upperValue: number;
}

export interface ValuationResponse {
  value: number;
  providerName?: string;
  valuation: Valuation;
  requestUrl: string;
}