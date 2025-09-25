import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Fast auth check with timeout
    const session = await Promise.race([
      getServerSession(authOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 2000),
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

    // Fast database query with timeout
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
        setTimeout(() => reject(new Error("Database timeout")), 3000),
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

    // Get optimized account data with timeout
    const dataFetchStart = Date.now();
    let accountData;

    try {
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
            setTimeout(() => reject(new Error("Data fetch timeout")), 5000),
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
            setTimeout(() => reject(new Error("Data fetch timeout")), 5000),
          ),
        ]);
      }
    } catch (error) {
      console.log(
        `❌ Data fetch failed: ${Date.now() - startTime}ms (fetch: ${Date.now() - dataFetchStart}ms)`,
        error,
      );
      return NextResponse.json(
        { error: "Failed to fetch account data", timeout: true },
        { status: 504 },
      );
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
