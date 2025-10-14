import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbRetry as retryDatabaseOperation } from "@/lib/database";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

interface Trading212Account {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  isPractice: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all user's Trading212 accounts
    const user = await retryDatabaseOperation(async () => {
      const userData = await db.findUserById(userId);
      if (!userData) return null;

      const accounts = await db.findTradingAccountsByUserId(userId, true);
      return {
        id: userData.id,
        trading212Accounts: accounts as unknown as Trading212Account[]
      };
    });

    if (!user || user.trading212Accounts.length === 0) {
      return NextResponse.json(
        { error: "No Trading212 accounts found" },
        { status: 404 }
      );
    }

    const warmingPromises = user.trading212Accounts.map(async (account) => {
      try {
        console.log(`🔥 Warming cache for account ${account.id} (${account.name})`);
        
        // Start cache warming in background (don't await)
        setImmediate(() => {
          optimizedTrading212Service.getAccountData(
            userId,
            account.id,
            account.apiKey,
            account.isPractice,
            false, // Don't include orders for warming
          ).then(() => {
            console.log(`✅ Cache warmed for account ${account.id}`);
          }).catch(error => {
            console.log(`❌ Cache warming failed for ${account.id}:`, error.message);
          });
        });

        return {
          accountId: account.id,
          name: account.name,
          status: "warming_started",
        };
      } catch (error) {
        return {
          accountId: account.id,
          name: account.name,
          status: "warming_failed",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const results = await Promise.all(warmingPromises);

    return NextResponse.json({
      message: "Cache warming initiated",
      accounts: results,
      total: results.length,
      initiated: results.filter(r => r.status === "warming_started").length,
    });

  } catch (error) {
    console.error("Cache warming error:", error);
    return NextResponse.json(
      { error: "Failed to initiate cache warming" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple health check for the warming endpoint
  return NextResponse.json({
    status: "ready",
    message: "Cache warming endpoint is available",
    usage: "POST to this endpoint to warm caches for all accounts",
  });
}

