import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";
import { apiCache } from "@/lib/api-cache";
import { apiBatcher } from "@/lib/api-batcher";
import { trading212RateLimiter } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get("detailed") === "true";

    // Get basic health status
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      uptime: Date.now() - startTime,
      services: {
        apiCache: apiCache.getStats(),
        apiBatcher: apiBatcher.getStats(),
      },
      optimization: await optimizedTrading212Service.healthCheck(),
    };

    // Add detailed information if requested
    if (detailed) {
      const detailedStatus = {
        ...healthStatus,
        performance: {
          cacheHitRate: await calculateCacheHitRate(),
          averageResponseTime: await getAverageResponseTime(),
          rateLimitStatus: getRateLimitStatus(),
        },
        configuration: {
          cacheTTL: {
            portfolio: "5 minutes",
            account: "10 minutes",
            orders: "2 minutes",
            positions: "5 minutes",
          },
          batchDelay: "50ms",
          maxBatchSize: 20,
          apiTimeout: "7 seconds",
        },
        recommendations: await getSystemRecommendations(),
      };

      return NextResponse.json(detailedStatus);
    }

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: "Health check failed",
        uptime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

async function calculateCacheHitRate(): Promise<number> {
  // This would ideally come from metrics collection
  // For now, return a placeholder
  return 0.75; // 75% cache hit rate
}

async function getAverageResponseTime(): Promise<number> {
  // This would ideally come from metrics collection
  // For now, return a placeholder
  return 250; // 250ms average response time
}

function getRateLimitStatus(): Record<string, boolean> {
  // Check rate limit status for common operations
  const testKeys = ["trading212-test-account-1", "trading212-test-account-2"];

  return testKeys.reduce(
    (status, key) => {
      status[key] = trading212RateLimiter.canMakeRequest(key);
      return status;
    },
    {} as Record<string, boolean>,
  );
}

async function getSystemRecommendations(): Promise<string[]> {
  const recommendations: string[] = [];

  const cacheStats = apiCache.getStats();
  const batchStats = apiBatcher.getStats();

  // Cache recommendations
  if (cacheStats.totalEntries < 50) {
    recommendations.push(
      "Consider increasing cache size for better performance",
    );
  }

  if (cacheStats.memoryUsage > 50 * 1024 * 1024) {
    // 50MB
    recommendations.push("Cache memory usage is high, consider cleanup");
  }

  // Batch recommendations
  if (batchStats.pendingBatches > 10) {
    recommendations.push(
      "High number of pending batches, check for bottlenecks",
    );
  }

  if (batchStats.totalPendingRequests > 100) {
    recommendations.push(
      "Many pending requests, consider increasing batch size",
    );
  }

  // Performance recommendations
  const cacheHitRate = await calculateCacheHitRate();
  if (cacheHitRate < 0.5) {
    recommendations.push("Low cache hit rate, consider optimizing cache TTL");
  }

  const avgResponseTime = await getAverageResponseTime();
  if (avgResponseTime > 1000) {
    recommendations.push("High response times detected, check API performance");
  }

  return recommendations;
}
