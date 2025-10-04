import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";
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
      retryDatabaseOperation(() =>
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            trading212Accounts: {
              where: accountId ? { id: accountId } : { isActive: true },
              select: {
                id: true,
                name: true,
                apiKey: true,
                isPractice: true,
                isDefault: true,
                isActive: true,
              },
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            },
          },
        }),
      ),
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

    // Get optimized account data with improved timeout handling
    const dataFetchStart = Date.now();
    let accountData;

    try {
      // Ultra-aggressive timeout for Hobby plan - fail fast and serve stale
      const timeoutMs = 3000;

      if (forceRefresh) {
        accountData = await Promise.race([
          optimizedTrading212Service.forceRefreshAccountData(
            userId,
            targetAccount.id,
            targetAccount.apiKey,
            targetAccount.isPractice,
            includeOrders,
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Data fetch timeout")),
              timeoutMs,
            ),
          ),
        ]);
      } else {
        accountData = await Promise.race([
          optimizedTrading212Service.getAccountData(
            userId,
            targetAccount.id,
            targetAccount.apiKey,
            targetAccount.isPractice,
            includeOrders,
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Data fetch timeout")),
              timeoutMs,
            ),
          ),
        ]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        `❌ Data fetch failed: ${Date.now() - startTime}ms (fetch: ${Date.now() - dataFetchStart}ms)`,
        { error: errorMessage, accountId: targetAccount.id },
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
          // No stale data available, return error
          return NextResponse.json(
            {
              error: "Failed to fetch account data - Trading212 API timeout",
              details: errorMessage,
              timeout: true,
              retryAfter: 30, // Suggest retry after 30 seconds
              accountInfo: {
                id: targetAccount.id,
                name: targetAccount.name,
                isPractice: targetAccount.isPractice,
                isDefault: targetAccount.isDefault,
              },
            },
            { status: 504 },
          );
        }
      } catch (_staleError) {
        void _staleError; // explicit ignore
        return NextResponse.json(
          {
            error: "Failed to fetch account data - no cached data available",
            details: errorMessage,
            timeout: true,
            retryAfter: 30,
            accountInfo: {
              id: targetAccount.id,
              name: targetAccount.name,
              isPractice: targetAccount.isPractice,
              isDefault: targetAccount.isDefault,
            },
          },
          { status: 504 },
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
