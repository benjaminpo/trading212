import { Trading212API } from "./trading212";
import { apiCache } from "./api-cache";
import logger from "@/lib/logger";

export interface BatchedRequest<T = unknown> {
  id: string;
  userId: string;
  accountId: string;
  requestType: "portfolio" | "account" | "orders" | "positions";
  resolve: (data: T) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

export interface BatchResult {
  accountId: string;
  requestType: string;
  data: unknown;
  error?: string;
}

export interface APIResult {
  type: string;
  data: unknown;
}

export class APIBatcher {
  private static instance: APIBatcher;
  private batches: Map<string, BatchedRequest<unknown>[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // 50ms batching window for faster response
  private readonly MAX_BATCH_SIZE = 20;

  private constructor() {}

  static getInstance(): APIBatcher {
    if (!APIBatcher.instance) {
      APIBatcher.instance = new APIBatcher();
    }
    return APIBatcher.instance;
  }

  private generateBatchKey(userId: string, requestType: string): string {
    return `${userId}:${requestType}`;
  }

  async request<T>(
    userId: string,
    accountId: string,
    requestType: BatchedRequest["requestType"],
    apiKey: string,
    isPractice: boolean,
  ): Promise<T> {
    // Check cache first
    const cached = await apiCache.get<T>(userId, accountId, requestType);
    if (cached !== null) {
      return cached;
    }

    return new Promise<T>((resolve, reject) => {
      const batchKey = this.generateBatchKey(userId, requestType);
      const request: BatchedRequest<T> = {
        id: `${accountId}:${Date.now()}`,
        userId,
        accountId,
        requestType,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }
      this.batches
        .get(batchKey)!
        .push(request as unknown as BatchedRequest<unknown>);

      // Schedule batch execution
      this.scheduleBatchExecution(batchKey, apiKey, isPractice);
    });
  }

  private scheduleBatchExecution(
    batchKey: string,
    apiKey: string,
    isPractice: boolean,
  ): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.executeBatch(batchKey, apiKey, isPractice);
    }, this.BATCH_DELAY);
  }

  private async executeBatch(
    batchKey: string,
    apiKey: string,
    isPractice: boolean,
  ): Promise<void> {
    const requests = this.batches.get(batchKey);
    if (!requests || requests.length === 0) {
      return;
    }

    this.batches.delete(batchKey);

    // Group requests by account
    const accountGroups = new Map<string, BatchedRequest<unknown>[]>();
    requests.forEach((req) => {
      if (!accountGroups.has(req.accountId)) {
        accountGroups.set(req.accountId, []);
      }
      accountGroups.get(req.accountId)!.push(req);
    });

    // Execute requests for each account
    const executionPromises = Array.from(accountGroups.entries()).map(
      ([accountId, accountRequests]) =>
        this.executeAccountBatch(
          accountId,
          accountRequests,
          apiKey,
          isPractice,
        ),
    );

    await Promise.allSettled(executionPromises);
  }

  private async executeAccountBatch(
    accountId: string,
    requests: BatchedRequest<unknown>[],
    apiKey: string,
    isPractice: boolean,
  ): Promise<void> {
    const trading212 = new Trading212API(apiKey, isPractice);
    const requestTypes = [...new Set(requests.map((req) => req.requestType))];

    logger.info(
      `🔄 Executing batch for account ${accountId}: ${requestTypes.join(", ")}`,
    );

    try {
      // Execute all API calls for this account in parallel with individual timeouts
      const apiPromises = requestTypes.map(async (requestType) => {
        // Add timeout wrapper for each individual API call
        const apiCallPromise = (async () => {
          switch (requestType) {
            case "portfolio":
              return {
                type: "portfolio",
                data: await trading212.getPositions(),
              };
            case "account":
              return { type: "account", data: await trading212.getAccount() };
            case "orders":
              return { type: "orders", data: await trading212.getOrders() };
            case "positions":
              return {
                type: "positions",
                data: await trading212.getPositions(),
              };
            default:
              throw new Error(`Unknown request type: ${requestType}`);
          }
        })();

        // 20 second timeout per API call (giving some buffer under the 15s axios timeout)
        return Promise.race([
          apiCallPromise,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout fetching ${requestType}`)),
              20000,
            ),
          ),
        ]);
      });

      const results = await Promise.allSettled(apiPromises);
      const successfulResults = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => (result as PromiseFulfilledResult<APIResult>).value);

      // Cache successful results
      for (const result of successfulResults) {
        const userId = requests[0].userId;
        await apiCache.set(
          userId,
          accountId,
          result.type as "portfolio" | "account" | "orders" | "positions",
          result.data,
        );
      }

      // Resolve all requests with appropriate data
      requests.forEach((request) => {
        const result = successfulResults.find(
          (r) => r.type === request.requestType,
        );
        if (result) {
          request.resolve(result.data);
        } else {
          const failedResult = results.find((r) => r.status === "rejected");
          request.reject(
            failedResult && failedResult.status === "rejected"
              ? failedResult.reason
              : new Error("Request failed"),
          );
        }
      });
    } catch (error) {
      console.error(
        `❌ Batch execution failed for account ${accountId}:`,
        error,
      );

      // Reject all requests in this batch
      requests.forEach((request) => {
        request.reject(error);
      });
    }
  }

  // Smart data fetching that combines multiple requests
  async fetchAccountData(
    userId: string,
    accountId: string,
    apiKey: string,
    isPractice: boolean,
    includeOrders: boolean = false,
  ): Promise<{
    account: unknown;
    portfolio: unknown[];
    orders?: unknown[];
    stats: unknown;
  }> {
    logger.info(`🎯 Smart fetch for account ${accountId}`);

    // Batch all requests together
    const [accountData, portfolioData, ordersData] = await Promise.allSettled([
      this.request(userId, accountId, "account", apiKey, isPractice),
      this.request(userId, accountId, "portfolio", apiKey, isPractice),
      includeOrders
        ? this.request(userId, accountId, "orders", apiKey, isPractice)
        : Promise.resolve([]),
    ]);

    const account =
      accountData.status === "fulfilled" ? accountData.value : null;
    const portfolio =
      portfolioData.status === "fulfilled"
        ? (portfolioData.value as unknown[])
        : [];
    const orders =
      ordersData.status === "fulfilled" ? (ordersData.value as unknown[]) : [];

    // Calculate stats
    const stats = this.calculateStats(portfolio);

    return {
      account,
      portfolio,
      orders: includeOrders ? orders : undefined,
      stats,
    };
  }

  private calculateStats(portfolio: unknown[]): Record<string, unknown> {
    const activePositions = portfolio.length;
    const totalPnL = portfolio.reduce(
      (sum: number, pos) => sum + ((pos as { ppl?: number }).ppl || 0),
      0,
    );
    const totalValue = portfolio.reduce(
      (sum: number, pos) =>
        sum +
        ((pos as { quantity?: number; currentPrice?: number }).quantity || 0) *
          ((pos as { quantity?: number; currentPrice?: number }).currentPrice ||
            0),
      0,
    );
    const totalPnLPercent =
      totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

    return {
      activePositions,
      totalPnL,
      totalPnLPercent,
      totalValue,
    };
  }

  // Multi-account data fetching with intelligent caching
  async fetchMultiAccountData(
    userId: string,
    accounts: Array<{ id: string; apiKey: string; isPractice: boolean }>,
    includeOrders: boolean = false,
  ): Promise<
    Array<{
      accountId: string;
      data: unknown;
      error?: string;
    }>
  > {
    logger.info(`🎯 Multi-account fetch for ${accounts.length} accounts`);

    const accountPromises = accounts.map(async (account) => {
      try {
        const data = await this.fetchAccountData(
          userId,
          account.id,
          account.apiKey,
          account.isPractice,
          includeOrders,
        );
        return {
          accountId: account.id,
          data,
        };
      } catch (error) {
        console.error(
          `❌ Failed to fetch data for account ${account.id}:`,
          error,
        );
        return {
          accountId: account.id,
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    return Promise.allSettled(accountPromises).then((results) =>
      results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            accountId: accounts[index].id,
            data: null,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown error",
          };
        }
      }),
    );
  }

  getStats(): { pendingBatches: number; totalPendingRequests: number } {
    let totalPendingRequests = 0;
    for (const batch of this.batches.values()) {
      totalPendingRequests += batch.length;
    }

    return {
      pendingBatches: this.batches.size,
      totalPendingRequests,
    };
  }
}

// Global batcher instance
export const apiBatcher = APIBatcher.getInstance();
