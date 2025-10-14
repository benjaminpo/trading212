import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbRetry as retryDatabaseOperation } from "@/lib/database";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Fast auth check with timeout - aggressive for Hobby plan
    const session = await Promise.race([
      getServerSession(authOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 1000),
      ),
    ]);

    if (!(session as Session)?.user?.id) {
      console.log(`🚫 Auth fail: ${Date.now() - startTime}ms`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as Session).user.id;

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const includeOrders = searchParams.get("includeOrders") === "true";
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    // Validate accountId format early to avoid unnecessary DB queries
    if (accountId && !/^[a-zA-Z0-9]{20,}$/.test(accountId)) {
      console.log(`🚫 Invalid accountId format: ${Date.now() - startTime}ms`);
      return NextResponse.json(
        { error: "Invalid account ID format" },
        { status: 400 },
      );
    }

    // Fast database query with timeout - aggressive for Hobby plan
    const user = await Promise.race([
      retryDatabaseOperation(async () => {
        const userData = await db.findUserById(userId);
        if (!userData) return null;

        const accounts = accountId
          ? [await db.findTradingAccountById(accountId)].filter(Boolean)
          : await db.findTradingAccountsByUserId(userId, true);

        return {
          id: userData.id,
          trading212Accounts: accounts,
        };
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 1500),
      ),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the target account
    type Account = {
      id: string;
      name: string;
      apiKey: string;
      isPractice: boolean;
      isDefault: boolean;
      isActive: boolean;
    };
    let targetAccount: Account | undefined = undefined;
    const userWithAccounts = user as { trading212Accounts: Array<Account> };
    if (accountId) {
      targetAccount = userWithAccounts.trading212Accounts.find(
        (acc) => acc.id === accountId,
      );
      if (!targetAccount) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 },
        );
      }
    } else {
      targetAccount =
        userWithAccounts.trading212Accounts.find((acc) => acc.isDefault) ||
        userWithAccounts.trading212Accounts.find((acc) => acc.isActive);
    }

    if (!targetAccount) {
      return NextResponse.json(
        {
          error: "No Trading212 accounts configured",
          connected: false,
        },
        { status: 400 },
      );
    }

    // Fast rate limiting check
    const rateLimitStart = Date.now();
    if (!optimizedTrading212Service.canMakeRequest(userId, targetAccount.id)) {
      const timeUntilReset = optimizedTrading212Service.getTimeUntilReset(
        userId,
        targetAccount.id,
      );
      console.log(
        `🚫 Rate limited: ${Date.now() - startTime}ms (rate check: ${Date.now() - rateLimitStart}ms)`,
      );
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(timeUntilReset / 1000),
          connected: true,
          accountInfo: {
            id: targetAccount.id,
            name: targetAccount.name,
            isPractice: targetAccount.isPractice,
            isDefault: targetAccount.isDefault,
          },
        },
        { status: 429 },
      );
    }

    // AGGRESSIVE CACHE-FIRST STRATEGY - Never make users wait!
    const dataFetchStart = Date.now();
    let accountData;

    // Always try to serve cached data first (even if stale)
    const { apiCache } = await import("@/lib/api-cache");
    const cachedData = await apiCache.getStale<{
      lastUpdated: string | Date | number;
      [key: string]: unknown;
    }>(userId, targetAccount.id, "account");

    // If we have ANY cached data (even expired), serve it immediately unless forceRefresh
    if (cachedData && !forceRefresh) {
      const cacheAge =
        Date.now() - new Date(cachedData.lastUpdated as string).getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      // Serve cached data if it's less than 30 minutes old
      if (cacheAge < thirtyMinutes) {
        console.log(
          `⚡ Serving cached data for account ${targetAccount.id} (age: ${Math.round(cacheAge / 1000)}s)`,
        );

        // Always start background refresh (don't await) - fire and forget
        setImmediate(() => {
          optimizedTrading212Service
            .getAccountData(
              userId,
              targetAccount.id,
              targetAccount.apiKey,
              targetAccount.isPractice,
              includeOrders,
            )
            .catch((error) => {
              console.log(
                `🔄 Background refresh failed for ${targetAccount.id}:`,
                error.message,
              );
            });
        });

        return NextResponse.json({
          ...cachedData,
          connected: true,
          accountInfo: {
            id: targetAccount.id,
            name: targetAccount.name,
            isPractice: targetAccount.isPractice,
            isDefault: targetAccount.isDefault,
          },
          cacheHit: true,
          stale: cacheAge > 5 * 60 * 1000, // Mark as stale if older than 5 minutes
          warning:
            cacheAge > 5 * 60 * 1000
              ? "Data may be outdated due to slow API"
              : undefined,
        });
      }
    }

    // If no cache or forceRefresh, try the API - let service handle all timeout logic
    try {
      if (forceRefresh) {
        accountData = await optimizedTrading212Service.forceRefreshAccountData(
          userId,
          targetAccount.id,
          targetAccount.apiKey,
          targetAccount.isPractice,
          includeOrders,
        );
      } else {
        accountData = await optimizedTrading212Service.getAccountData(
          userId,
          targetAccount.id,
          targetAccount.apiKey,
          targetAccount.isPractice,
          includeOrders,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const fetchTime = Date.now() - dataFetchStart;
      const totalTime = Date.now() - startTime;

      console.log(
        `❌ Data fetch failed: ${totalTime}ms (fetch: ${fetchTime}ms) { error: '${errorMessage}', accountId: '${targetAccount.id}', timeout: ${errorMessage.includes("timeout") ? "YES" : "NO"} }`,
      );

      // Try to serve stale data if available (even if cache is expired)
      try {
        // Use the special getStale method from cache to get expired data
        const { apiCache } = await import("@/lib/api-cache");
        const staleData = await apiCache.getStale<{
          lastUpdated: string | Date | number;
          [key: string]: unknown;
        }>(userId, targetAccount.id, "account");

        if (staleData) {
          console.log(
            `⚡ Serving stale/expired cache data after timeout for account ${targetAccount.id}`,
          );
          // Convert lastUpdated to string
          let lastUpdatedStr = new Date().toISOString();
          if (typeof staleData.lastUpdated === "string") {
            lastUpdatedStr = staleData.lastUpdated;
          } else if (staleData.lastUpdated instanceof Date) {
            lastUpdatedStr = staleData.lastUpdated.toISOString();
          } else if (typeof staleData.lastUpdated === "number") {
            lastUpdatedStr = new Date(staleData.lastUpdated).toISOString();
          }

          accountData = {
            ...staleData,
            cacheHit: true,
            stale: true,
            warning: "Data may be outdated due to API timeout",
            lastUpdated: lastUpdatedStr,
          };
        } else {
          // LAST RESORT: No stale data available - provide minimal response
          console.log(
            `🚨 No cached data available for account ${targetAccount.id}, providing minimal response`,
          );
          return NextResponse.json(
            {
              error: "Trading212 API is temporarily unavailable",
              details: errorMessage,
              timeout: true,
              retryAfter: 60, // Suggest retry after 1 minute
              connected: false,
              accountInfo: {
                id: targetAccount.id,
                name: targetAccount.name,
                isPractice: targetAccount.isPractice,
                isDefault: targetAccount.isDefault,
              },
              // Provide empty but valid structure so UI doesn't break
              account: { cash: 0, currency: "USD" },
              portfolio: [],
              orders: [],
              stats: {
                activePositions: 0,
                totalPnL: 0,
                totalPnLPercent: 0,
                totalValue: 0,
                todayPnL: 0,
                todayPnLPercent: 0,
              },
              currency: "USD",
              lastUpdated: new Date().toISOString(),
              cacheHit: false,
              warning: "Unable to fetch current data - please try again later",
            },
            { status: 503 }, // Service Unavailable instead of 504
          );
        }
      } catch (_staleError) {
        void _staleError; // explicit ignore
        console.log(
          `🚨 Cache error for account ${targetAccount.id}, providing minimal response`,
        );
        return NextResponse.json(
          {
            error: "Trading212 service temporarily unavailable",
            details: errorMessage,
            timeout: true,
            retryAfter: 60,
            connected: false,
            accountInfo: {
              id: targetAccount.id,
              name: targetAccount.name,
              isPractice: targetAccount.isPractice,
              isDefault: targetAccount.isDefault,
            },
            // Provide empty but valid structure
            account: { cash: 0, currency: "USD" },
            portfolio: [],
            orders: [],
            stats: {
              activePositions: 0,
              totalPnL: 0,
              totalPnLPercent: 0,
              totalValue: 0,
              todayPnL: 0,
              todayPnLPercent: 0,
            },
            currency: "USD",
            lastUpdated: new Date().toISOString(),
            cacheHit: false,
            warning: "Service temporarily unavailable - please try again later",
          },
          { status: 503 },
        );
      }
    }

    // Add account metadata and performance info
    const totalTime = Date.now() - startTime;
    const accountDataTyped = accountData as Record<string, unknown>;
    const response = {
      ...accountDataTyped,
      accountInfo: {
        id: targetAccount.id,
        name: targetAccount.name,
        isPractice: targetAccount.isPractice,
        isDefault: targetAccount.isDefault,
      },
      connected: true,
      cacheStats: {
        cacheHit: accountDataTyped.cacheHit,
        lastUpdated: accountDataTyped.lastUpdated,
      },
      performance: {
        totalTime,
        dataFetchTime: Date.now() - dataFetchStart,
        rateLimitTime: Date.now() - rateLimitStart,
      },
    };

    console.log(
      `✅ Success: ${totalTime}ms (auth: ${Date.now() - startTime}ms, data: ${Date.now() - dataFetchStart}ms, cache: ${accountDataTyped.cacheHit ? "HIT" : "MISS"})`,
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("Optimized account data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account data" },
      { status: 500 },
    );
  }
}
