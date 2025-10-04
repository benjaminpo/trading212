import {
  Trading212Account,
  Trading212Position,
  Trading212Order,
} from "./trading212";
import { apiCache } from "./api-cache";
import { apiBatcher } from "./api-batcher";
import { trading212RateLimiter } from "./rate-limiter";
import logger from "@/lib/logger";

export interface OptimizedAccountData {
  account: Trading212Account | null;
  portfolio: Trading212Position[];
  orders: Trading212Order[];
  stats: {
    activePositions: number;
    totalPnL: number;
    totalPnLPercent: number;
    totalValue: number;
    todayPnL: number;
    todayPnLPercent: number;
  };
  currency: string;
  lastUpdated: string;
  cacheHit: boolean;
}

export interface OptimizedPortfolioData {
  positions: Trading212Position[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  currency: string;
  lastUpdated: string;
  cacheHit: boolean;
}

export interface MultiAccountResult {
  accountId: string;
  data: OptimizedAccountData | null;
  error?: string;
  cacheHit: boolean;
}

export class OptimizedTrading212Service {
  private static instance: OptimizedTrading212Service;
  private pendingFetches: Map<string, Promise<OptimizedAccountData>> =
    new Map();
  private circuitBreaker: Map<string, { openUntil: number; failures: number }> =
    new Map();

  private constructor() {}

  static getInstance(): OptimizedTrading212Service {
    if (!OptimizedTrading212Service.instance) {
      OptimizedTrading212Service.instance = new OptimizedTrading212Service();
    }
    return OptimizedTrading212Service.instance;
  }

  async getAccountData(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
    includeOrders: boolean = false,
  ): Promise<OptimizedAccountData> {
    logger.info(`🎯 Optimized fetch for account ${accountId}`);

    // Check cache first - prioritize stale cache for Hobby plan
    const cached = await apiCache.get<OptimizedAccountData>(
      userId,
      accountId,
      "account",
    );
    if (cached) {
      logger.info(`🎯 Cache HIT for account ${accountId}`);
      return {
        ...cached,
        cacheHit: true,
      };
    }

    // For Hobby plan: check stale cache immediately if no fresh cache
    const staleCached = await apiCache.getStale<OptimizedAccountData>(
      userId,
      accountId,
      "account",
    );
    if (staleCached) {
      logger.info(
        `⚡ Serving STALE cache immediately for account ${accountId} (Hobby plan optimization)`,
      );
      return {
        ...staleCached,
        cacheHit: true,
        stale: true,
        warning: "Serving cached data for faster response",
      };
    }

    // Aggressive circuit breaker check - fail fast for Hobby plan
    const cbKey = `${userId}:${accountId}`;
    const now = Date.now();
    const cbState = this.circuitBreaker.get(cbKey);
    if (cbState && cbState.openUntil > now) {
      const stale = await apiCache.getStale<OptimizedAccountData>(
        userId,
        accountId,
        "account",
      );
      if (stale) {
        logger.info(
          `⚡ Serving STALE (circuit open) for account ${accountId} until ${new Date(cbState.openUntil).toISOString()}`,
        );
        return { ...stale, cacheHit: true, stale: true };
      }
      throw new Error("Upstream temporarily unavailable (circuit open)");
    }

    // Check if we're already fetching this data to avoid duplicate requests
    const fetchKey = `${userId}:${accountId}:account`;
    if (this.pendingFetches.has(fetchKey)) {
      logger.info(`🎯 Waiting for pending fetch for account ${accountId}`);
      return this.pendingFetches.get(fetchKey)!;
    }

    // Create a promise for this fetch
    const fetchPromise = (async () => {
      try {
        const result = await this.performAccountDataFetch(
          userId,
          accountId,
          apiKey,
          isPractice,
          includeOrders,
        );

        // success: reset circuit breaker
        this.circuitBreaker.delete(cbKey);
        return result;
      } catch (error) {
        // update circuit breaker failures
        const current = this.circuitBreaker.get(cbKey) || {
          failures: 0,
          openUntil: 0,
        };
        current.failures += 1;
        if (current.failures >= 1) {
          // Ultra-aggressive - fail after 1 failure
          current.openUntil = Date.now() + 15_000; // 15s circuit open
        }
        this.circuitBreaker.set(cbKey, current);

        // Try serving stale
        const stale = await apiCache.getStale<OptimizedAccountData>(
          userId,
          accountId,
          "account",
        );
        if (stale) {
          logger.info(
            `⚡ Serving STALE after error for account ${accountId} (failures=${current.failures})`,
          );
          return { ...stale, cacheHit: true };
        }
        throw error;
      }
    })();

    // Store the promise to prevent duplicate requests
    this.pendingFetches.set(fetchKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up the pending fetch
      this.pendingFetches.delete(fetchKey);
    }
  }

  async getPortfolioData(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
  ): Promise<OptimizedPortfolioData> {
    logger.info(`🎯 Optimized portfolio fetch for account ${accountId}`);

    // Check cache first
    const cached = await apiCache.get<OptimizedPortfolioData>(
      userId,
      accountId,
      "portfolio",
    );
    if (cached) {
      logger.info(`🎯 Portfolio Cache HIT for account ${accountId}`);
      return {
        ...cached,
        cacheHit: true,
      };
    }

    // Use batcher for API calls
    const positions = await apiBatcher.request<Trading212Position[]>(
      userId,
      accountId,
      "portfolio",
      apiKey,
      isPractice,
    );

    // Calculate portfolio stats
    const totalValue = positions.reduce(
      (sum, pos) => sum + pos.quantity * pos.currentPrice,
      0,
    );
    const totalPnL = positions.reduce((sum, pos) => sum + (pos.ppl || 0), 0);
    const totalPnLPercent =
      totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

    const optimizedData: OptimizedPortfolioData = {
      positions,
      totalValue,
      totalPnL,
      totalPnLPercent,
      currency: "USD", // This should come from account data
      lastUpdated: new Date().toISOString(),
      cacheHit: false,
    };

    // Cache the result
    await apiCache.set(userId, accountId, "portfolio", optimizedData);

    return optimizedData;
  }

  async getMultiAccountData(
    userId: string,
    accounts: Array<{
      id: string;
      apiKey: string;
      isPractice: boolean;
      name: string;
    }>,
    includeOrders: boolean = false,
  ): Promise<MultiAccountResult[]> {
    logger.info(
      `🎯 Multi-account optimized fetch for ${accounts.length} accounts`,
    );

    // Use batcher for multi-account data
    const results = await apiBatcher.fetchMultiAccountData(
      userId,
      accounts,
      includeOrders,
    );

    return results.map((result) => ({
      accountId: result.accountId,
      data: result.data
        ? {
            ...(result.data as OptimizedAccountData),
            cacheHit: false, // Batcher handles caching internally
          }
        : null,
      error: result.error,
      cacheHit: false,
    }));
  }

  async getAggregatedAccountData(
    userId: string,
    accounts: Array<{
      id: string;
      apiKey: string;
      isPractice: boolean;
      name: string;
    }>,
  ): Promise<{
    totalStats: {
      activePositions: number;
      totalPnL: number;
      totalPnLPercent: number;
      totalValue: number;
      connectedAccounts: number;
    };
    accountResults: MultiAccountResult[];
    cacheHits: number;
  }> {
    logger.info(`🎯 Aggregated data fetch for ${accounts.length} accounts`);

    const accountResults = await this.getMultiAccountData(userId, accounts);

    // Aggregate stats
    const totalStats = {
      activePositions: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      totalValue: 0,
      connectedAccounts: 0,
    };

    let cacheHits = 0;

    for (const result of accountResults) {
      if (result.data && !result.error) {
        totalStats.activePositions += result.data.stats.activePositions;
        totalStats.totalPnL += result.data.stats.totalPnL;
        totalStats.totalValue += result.data.stats.totalValue;
        totalStats.connectedAccounts++;

        if (result.cacheHit) {
          cacheHits++;
        }
      }
    }

    // Calculate overall percentage
    totalStats.totalPnLPercent =
      totalStats.totalValue > 0
        ? (totalStats.totalPnL /
            (totalStats.totalValue - totalStats.totalPnL)) *
          100
        : 0;

    return {
      totalStats,
      accountResults,
      cacheHits,
    };
  }

  // Smart cache invalidation
  async invalidateCache(
    userId: string,
    accountId?: string,
    dataType?: "portfolio" | "account" | "orders" | "positions",
  ): Promise<void> {
    await apiCache.invalidate(userId, accountId, dataType);
    logger.info(
      `🗑️ Cache invalidated for user ${userId}, account ${accountId}, type ${dataType}`,
    );
  }

  // Rate limiting status
  canMakeRequest(userId: string, accountId: string): boolean {
    const rateLimitKey = `trading212-${userId}-${accountId}`;
    return trading212RateLimiter.canMakeRequest(rateLimitKey);
  }

  getTimeUntilReset(userId: string, accountId: string): number {
    const rateLimitKey = `trading212-${userId}-${accountId}`;
    return trading212RateLimiter.getTimeUntilReset(rateLimitKey);
  }

  // Batch status and statistics
  getBatchStats() {
    return apiBatcher.getStats();
  }

  getCacheStats() {
    return apiCache.getStats();
  }

  // Force refresh (bypass cache)
  async forceRefreshAccountData(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
    includeOrders: boolean = false,
  ): Promise<OptimizedAccountData> {
    // Invalidate cache first
    await this.invalidateCache(userId, accountId, "account");

    // Fetch fresh data
    return this.getAccountData(
      userId,
      accountId,
      apiKey,
      isPractice,
      includeOrders,
    );
  }

  // Background sync for keeping data fresh
  async backgroundSync(
    userId: string,
    accounts: Array<{
      id: string;
      apiKey: string;
      isPractice: boolean;
      name: string;
    }>,
  ): Promise<void> {
    logger.info(`🔄 Background sync for user ${userId}`);

    // Only sync if rate limits allow
    const accountsToSync = accounts.filter((account) =>
      this.canMakeRequest(userId, account.id),
    );

    if (accountsToSync.length === 0) {
      logger.info("⏳ All accounts are rate limited, skipping background sync");
      return;
    }

    try {
      await this.getMultiAccountData(userId, accountsToSync);
      logger.info(
        `✅ Background sync completed for ${accountsToSync.length} accounts`,
      );
    } catch (error) {
      console.error("❌ Background sync failed:", error);
    }
  }

  // Helper method to perform the actual data fetch
  private async performAccountDataFetch(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
    includeOrders: boolean,
  ): Promise<OptimizedAccountData> {
    // Use batcher for API calls
    let batchedData: {
      account: unknown;
      portfolio: unknown[];
      orders?: unknown[];
      stats: unknown;
    };
    try {
      batchedData = await apiBatcher.fetchAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        includeOrders,
      );
    } catch (err) {
      // Compose from stale pieces if available
      const staleAccount = await apiCache.getStale<OptimizedAccountData | null>(
        userId,
        accountId,
        "account",
      );
      const stalePortfolio = await apiCache.getStale<{
        positions: Trading212Position[];
        totalValue: number;
        totalPnL: number;
        totalPnLPercent: number;
      }>(userId, accountId, "portfolio");
      const staleOrders = includeOrders
        ? await apiCache.getStale<Trading212Order[]>(
            userId,
            accountId,
            "orders",
          )
        : null;
      if (staleAccount || stalePortfolio || staleOrders) {
        batchedData = {
          account: staleAccount?.account ?? null,
          portfolio: stalePortfolio?.positions ?? [],
          orders: staleOrders ?? [],
          stats: stalePortfolio
            ? {
                totalValue: stalePortfolio.totalValue,
                totalPnL: stalePortfolio.totalPnL,
                totalPnLPercent: stalePortfolio.totalPnLPercent,
                activePositions: Array.isArray(stalePortfolio.positions)
                  ? stalePortfolio.positions.length
                  : 0,
              }
            : {},
        };
      } else {
        throw err;
      }
    }

    // Transform to optimized format
    const optimizedData: OptimizedAccountData = {
      account: batchedData.account as Trading212Account | null,
      portfolio: batchedData.portfolio as Trading212Position[],
      orders: (batchedData.orders || []) as Trading212Order[],
      stats: {
        activePositions: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        totalValue: 0,
        todayPnL: 0,
        todayPnLPercent: 0,
        ...(batchedData.stats as Record<string, unknown>),
      },
      currency:
        (batchedData.account as { currencyCode?: string })?.currencyCode ||
        "USD",
      lastUpdated: new Date().toISOString(),
      cacheHit: false,
    };

    // Derive today's P/L from account summary if available
    const accountSummary = batchedData.account as Trading212Account | null;
    if (accountSummary) {
      const todayPnL =
        typeof accountSummary.result === "number" ? accountSummary.result : 0;
      const totalValue =
        typeof optimizedData.stats.totalValue === "number"
          ? optimizedData.stats.totalValue
          : 0;
      optimizedData.stats.todayPnL = todayPnL;
      optimizedData.stats.todayPnLPercent =
        totalValue > 0 ? (todayPnL / (totalValue - todayPnL)) * 100 : 0;
    }

    // Cache the result
    await apiCache.set(userId, accountId, "account", optimizedData);

    return optimizedData;
  }

  // Health check
  async healthCheck(): Promise<{
    cache: { totalEntries: number; memoryUsage: number };
    batches: { pendingBatches: number; totalPendingRequests: number };
    rateLimiter: { canMakeRequest: boolean };
  }> {
    return {
      cache: this.getCacheStats(),
      batches: this.getBatchStats(),
      rateLimiter: { canMakeRequest: true }, // This would need to be implemented
    };
  }
}

// Global optimized Trading212 service instance
export const optimizedTrading212Service =
  OptimizedTrading212Service.getInstance();
