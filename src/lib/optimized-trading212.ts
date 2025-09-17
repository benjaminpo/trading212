import {
  Trading212Account,
  Trading212Position,
  Trading212Order,
} from "./trading212";
import { apiCache } from "./api-cache";
import { apiBatcher } from "./api-batcher";
import { trading212RateLimiter } from "./rate-limiter";

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
    console.log(`🎯 Optimized fetch for account ${accountId}`);

    // Check cache first
    const cached = await apiCache.get<OptimizedAccountData>(
      userId,
      accountId,
      "account",
    );
    if (cached) {
      console.log(`🎯 Cache HIT for account ${accountId}`);
      return {
        ...cached,
        cacheHit: true,
      };
    }

    // Use batcher for API calls
    const batchedData = await apiBatcher.fetchAccountData(
      userId,
      accountId,
      apiKey,
      isPractice,
      includeOrders,
    );

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

  async getPortfolioData(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
  ): Promise<OptimizedPortfolioData> {
    console.log(`🎯 Optimized portfolio fetch for account ${accountId}`);

    // Check cache first
    const cached = await apiCache.get<OptimizedPortfolioData>(
      userId,
      accountId,
      "portfolio",
    );
    if (cached) {
      console.log(`🎯 Portfolio Cache HIT for account ${accountId}`);
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
    console.log(
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
    console.log(`🎯 Aggregated data fetch for ${accounts.length} accounts`);

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
    console.log(
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
    console.log(`🔄 Background sync for user ${userId}`);

    // Only sync if rate limits allow
    const accountsToSync = accounts.filter((account) =>
      this.canMakeRequest(userId, account.id),
    );

    if (accountsToSync.length === 0) {
      console.log("⏳ All accounts are rate limited, skipping background sync");
      return;
    }

    try {
      await this.getMultiAccountData(userId, accountsToSync);
      console.log(
        `✅ Background sync completed for ${accountsToSync.length} accounts`,
      );
    } catch (error) {
      console.error("❌ Background sync failed:", error);
    }
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
