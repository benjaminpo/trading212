import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Trading212API } from "@/lib/trading212";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test API health with a minimal request
    const testApiKey = process.env.TRADING212_TEST_API_KEY || "test-key";
    const trading212 = new Trading212API(testApiKey, true); // Use demo mode

    const startTime = Date.now();
    let status = "unknown";
    let responseTime = 0;
    let error = null;

    try {
      // Try a simple validation call with shorter timeout
      const result = await Promise.race([
        trading212.validateConnection(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 5000),
        ),
      ]);

      responseTime = Date.now() - startTime;
      status = result ? "healthy" : "degraded";
    } catch (err) {
      responseTime = Date.now() - startTime;
      status = "unhealthy";
      error = err instanceof Error ? err.message : "Unknown error";
    }

    const healthStatus = {
      status,
      responseTime,
      timestamp: new Date().toISOString(),
      ...(error && { error }),
      recommendations: {
        healthy: "API is responding normally",
        degraded: "API is slow but functional - expect delays",
        unhealthy:
          "API is experiencing issues - serving cached data when possible",
      }[status],
    };

    const httpStatus =
      status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return NextResponse.json(healthStatus, { status: httpStatus });
  } catch (error) {
    console.error("Trading212 health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to perform health check",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
