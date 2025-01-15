import { Provider } from '../providers/types/provider';
import {
  ValuationRequest,
  ValuationResponse,
} from '../providers/types/validation';

export class ProviderManager {
  private readonly FAILURE_THRESHOLD = 0.5;
  private readonly RESET_INTERVAL = 1000 * 60 * 15; // 15 minutes

  private requestWindow: { success: boolean; timestamp: number }[] = [];
  private usingFallback = false;
  private fallbackTimer: NodeJS.Timeout | null = null;

  constructor(
    private primaryProvider: Provider,
    private fallbackProvider: Provider,
    private windowSize = 100,
  ) {}

  private calculateFailureRate(): number {
    const now = Date.now();
    // Remove old entries
    this.requestWindow = this.requestWindow.filter(
      (req) => now - req.timestamp < 60000,
    );

    if (this.requestWindow.length === 0) return 0;

    const failures = this.requestWindow.filter((req) => !req.success).length;
    return failures / this.requestWindow.length;
  }

  private recordRequest(success: boolean) {
    this.requestWindow.push({ success, timestamp: Date.now() });
    if (this.requestWindow.length > this.windowSize) {
      this.requestWindow.shift();
    }
  }

  async getValuation(request: ValuationRequest): Promise<ValuationResponse> {
    if (!this.usingFallback) {
      try {
        const result = await this.primaryProvider.getValuation(request);
        this.recordRequest(true);
        return result;
      } catch (error) {
        this.recordRequest(false);

        if (this.calculateFailureRate() > this.FAILURE_THRESHOLD) {
          this.switchToFallback();
          try {
            return await this.fallbackProvider.getValuation(request);
          } catch (fallbackError) {
            throw new Error('Service Unavailable');
          }
        }
        throw error;
      }
    }

    try {
      return await this.fallbackProvider.getValuation(request);
    } catch (error) {
      throw new Error('Service Unavailable');
    }
  }

  private switchToFallback() {
    this.usingFallback = true;
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);

    this.fallbackTimer = setTimeout(() => {
      this.usingFallback = false;
      this.requestWindow = [];
    }, this.RESET_INTERVAL);
  }
}
