import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    // Get user with Trading212 accounts
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          trading212Accounts: {
            where: accountId ? { id: accountId } : { isActive: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          },
        },
      }),
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the target account
    let targetAccount = null;
    if (accountId) {
      targetAccount = user.trading212Accounts.find(
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
        user.trading212Accounts.find((acc) => acc.isDefault) ||
        user.trading212Accounts.find((acc) => acc.isActive);
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

    // Check rate limiting
    if (
      !optimizedTrading212Service.canMakeRequest(
        session.user.id,
        targetAccount.id,
      )
    ) {
      const timeUntilReset = optimizedTrading212Service.getTimeUntilReset(
        session.user.id,
        targetAccount.id,
      );
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(timeUntilReset / 1000),
          connected: true,
        },
        { status: 429 },
      );
    }

    // Get optimized portfolio data
    let accountData;
    if (forceRefresh) {
      accountData = await optimizedTrading212Service.forceRefreshAccountData(
        session.user.id,
        targetAccount.id,
        targetAccount.apiKey,
        targetAccount.isPractice,
        false, // Don't include orders for portfolio endpoint
      );
    } else {
      accountData = await optimizedTrading212Service.getAccountData(
        session.user.id,
        targetAccount.id,
        targetAccount.apiKey,
        targetAccount.isPractice,
        false, // Don't include orders for portfolio endpoint
      );
    }

    // Return portfolio data in the expected format
    const response = {
      positions: accountData.portfolio || [],
      accountInfo: {
        id: targetAccount.id,
        name: targetAccount.name,
        isPractice: targetAccount.isPractice,
        isDefault: targetAccount.isDefault,
      },
      connected: true,
      cacheStats: {
        cacheHit: accountData.cacheHit,
        lastUpdated: accountData.lastUpdated,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Optimized portfolio data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio data" },
      { status: 500 },
    );
  }
}
