import { Provider, ValuationRequest, ValuationResponse } from '@app/providers';
import {
  redisClient,
  redlock,
  CACHE_KEYS,
  CACHE_TTL,
} from '@app/config';
import { Repository } from 'typeorm';
import { ProviderLog } from '@app/models';
import { Logger } from 'pino';
import { ProviderError, ProviderHealth } from '@app/services/types';

export class DistributedProviderManager {
  private readonly nodeId: string;
  private isLeader: boolean = false;
  private leaderCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private readonly RESET_INTERVAL = 1000 * 60 * 15; // 15 minutes

  constructor(
    private primaryProvider: Provider,
    private fallbackProvider: Provider,
    private providerLogRepository: Repository<ProviderLog>,
    private logger: Logger,
    private readonly failureThreshold: number = 0.5,
    private readonly windowSize: number = 100,
  ) {
    this.nodeId = Math.random().toString(36).substring(7);
    this.startLeaderElection();
    this.startHealthCheck();
  }

  private async startLeaderElection(): Promise<void> {
    // Try to become leader every 20 seconds
    this.leaderCheckInterval = setInterval(async () => {
      try {
        const lock = await redlock.acquire(
          [CACHE_KEYS.LEADER_LOCK],
          CACHE_TTL.LEADER_LOCK * 1000,
        );
        this.isLeader = true;

        // Release lock after 25 seconds
        setTimeout(async () => {
          await lock.release();
          this.isLeader = false;
        }, 25000);
      } catch {
        this.isLeader = false;
      }
    }, 20000);
  }

  private async startHealthCheck(): Promise<void> {
    // Check and update provider health every minute if leader
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isLeader) return;

      const health = await this.getProviderHealth();
      if (
        health.total > 0 &&
        health.failures / health.total > this.failureThreshold
      ) {
        await this.switchToFallback();
      }
    }, 60000);
  }

  private async getProviderHealth(): Promise<ProviderHealth> {
    const healthKey = `${CACHE_KEYS.PROVIDER_HEALTH}${this.primaryProvider.name}`;
    const healthData = await redisClient.get(healthKey);

    if (!healthData) {
      return { failures: 0, total: 0, lastUpdated: Date.now() };
    }

    return JSON.parse(healthData);
  }

  private async updateProviderHealth(success: boolean): Promise<void> {
    const healthKey = `${CACHE_KEYS.PROVIDER_HEALTH}${this.primaryProvider.name}`;
    const health = await this.getProviderHealth();

    // Remove old entries (older than 1 minute)
    const now = Date.now();
    if (now - health.lastUpdated > 60000) {
      health.total = 0;
      health.failures = 0;
    }

    // Maintain sliding window
    if (health.total >= this.windowSize) {
      health.total--;
      if (!success) health.failures--;
    }

    health.total++;
    if (!success) health.failures++;
    health.lastUpdated = now;

    await redisClient.set(
      healthKey,
      JSON.stringify(health),
      'EX',
      CACHE_TTL.PROVIDER_HEALTH,
    );

    // If failure rate exceeds threshold, switch to fallback immediately
    if (
      health.total > 0 &&
      health.failures / health.total > this.failureThreshold
    ) {
      await this.switchToFallback();
    }
  }

  private async switchToFallback(): Promise<void> {
    const statsKey = `${CACHE_KEYS.PROVIDER_STATS}${this.primaryProvider.name}`;
    await redisClient.set(statsKey, 'fallback', 'EX', CACHE_TTL.PROVIDER_STATS);

    // Reset health after switching
    const healthKey = `${CACHE_KEYS.PROVIDER_HEALTH}${this.primaryProvider.name}`;
    await redisClient.del(healthKey);

    // Set timer to reset fallback status
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    this.fallbackTimer = setTimeout(async () => {
      await redisClient.del(statsKey);
      await redisClient.del(healthKey);
    }, this.RESET_INTERVAL);
  }

  private async isFallbackActive(): Promise<boolean> {
    const statsKey = `${CACHE_KEYS.PROVIDER_STATS}${this.primaryProvider.name}`;
    return (await redisClient.get(statsKey)) === 'fallback';
  }

  async getValuation(request: ValuationRequest): Promise<ValuationResponse> {
    const startTime = Date.now();
    const useFallback = await this.isFallbackActive();
    const activeProvider = useFallback
      ? this.fallbackProvider
      : this.primaryProvider;

    try {
      const result = await activeProvider.getValuation(request);

      if (!useFallback) {
        await this.updateProviderHealth(true);
      }

      await this.logProviderRequest({
        vrm: request.vrm,
        providerName: activeProvider.name,
        requestDateTime: new Date(),
        requestDuration: Date.now() - startTime,
        requestUrl:
          result.requestUrl ||
          activeProvider.getRequestUrl(request.vrm, request.mileage),
        responseCode: 200,
        isFallbackProvider: useFallback,
        errorMessage: undefined,
      });

      return result;
    } catch (error) {
      const typedError = error as ProviderError;
      const responseCode = typedError.status || 503;

      if (!useFallback) {
        await this.updateProviderHealth(false);

        // Log primary failure
        await this.logProviderRequest({
          vrm: request.vrm,
          providerName: activeProvider.name,
          requestDateTime: new Date(),
          requestDuration: Date.now() - startTime,
          requestUrl: activeProvider.getRequestUrl(
            request.vrm,
            request.mileage,
          ),
          responseCode: responseCode,
          errorMessage: typedError.message,
          isFallbackProvider: useFallback,
        });

        // Try fallback if primary fails
        try {
          const fallbackResult =
            await this.fallbackProvider.getValuation(request);
          await this.logProviderRequest({
            vrm: request.vrm,
            providerName: this.fallbackProvider.name,
            requestDateTime: new Date(),
            requestDuration: Date.now() - startTime,
            requestUrl:
              fallbackResult.requestUrl ||
              this.fallbackProvider.getRequestUrl(request.vrm, request.mileage),
            responseCode: 200,
            isFallbackProvider: true,
            errorMessage: undefined,
          });
          return fallbackResult;
        } catch (fallbackError) {
          const typedFallbackError = fallbackError as ProviderError;
          const fallbackResponseCode = typedFallbackError.status || 503;
          await this.logProviderRequest({
            vrm: request.vrm,
            providerName: this.fallbackProvider.name,
            requestDateTime: new Date(),
            requestDuration: Date.now() - startTime,
            requestUrl: this.fallbackProvider.getRequestUrl(
              request.vrm,
              request.mileage,
            ),
            responseCode: fallbackResponseCode,
            errorMessage: typedFallbackError.message,
            isFallbackProvider: true,
          });
          throw new Error('Service Unavailable');
        }
      }

      // Log failure for already fallback provider
      await this.logProviderRequest({
        vrm: request.vrm,
        providerName: activeProvider.name,
        requestDateTime: new Date(),
        requestDuration: Date.now() - startTime,
        requestUrl: activeProvider.getRequestUrl(request.vrm, request.mileage),
        responseCode: responseCode,
        errorMessage: typedError.message,
        isFallbackProvider: useFallback,
      });
      throw error;
    }
  }

  private async logProviderRequest(
    log: Omit<ProviderLog, 'id'>,
  ): Promise<void> {
    await this.providerLogRepository.save(log);
  }

  cleanup(): void {
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
  }
}
