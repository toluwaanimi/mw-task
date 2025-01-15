export interface ProviderHealth {
  failures: number;
  total: number;
  lastUpdated: number;
}

export interface ProviderError extends Error {
  message: string;
  status?: number;
}