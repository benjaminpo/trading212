import { NextRequest } from "next/server";
import { GET } from "@/app/api/health/optimization/route";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock optimization services
jest.mock("@/lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    getCacheStats: jest
      .fn()
      .mockReturnValue({ totalEntries: 5, memoryUsage: 10240 }),
    getBatchStats: jest
      .fn()
      .mockReturnValue({ pendingBatches: 1, totalPendingRequests: 3 }),
    healthCheck: jest.fn().mockResolvedValue({
      cache: { totalEntries: 5, memoryUsage: 10240 },
      batches: { pendingBatches: 1, totalPendingRequests: 3 },
      rateLimiter: { canMakeRequest: true },
    }),
  },
}));

jest.mock("@/lib/api-cache", () => ({
  apiCache: {
    getStats: jest
      .fn()
      .mockReturnValue({ totalEntries: 5, memoryUsage: 10240 }),
  },
}));

jest.mock("@/lib/api-batcher", () => ({
  apiBatcher: {
    getStats: jest
      .fn()
      .mockReturnValue({ pendingBatches: 1, totalPendingRequests: 3 }),
  },
}));

jest.mock("@/lib/rate-limiter", () => ({
  trading212RateLimiter: {
    canMakeRequest: jest.fn().mockReturnValue(true),
    getTimeUntilReset: jest.fn().mockReturnValue(0),
  },
}));

describe("/api/health/optimization", () => {
  const mockSession = {
    user: {
      id: "user123",
    },
  };

  beforeEach(() => {
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue(mockSession);
  });

  describe("GET", () => {
    it("should return health data for authenticated user", async () => {
      const request = new NextRequest(
        "http://localhost/api/health/optimization",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("services");
      expect(data).toHaveProperty("optimization");
      expect(data.services).toHaveProperty("apiCache");
      expect(data.services).toHaveProperty("apiBatcher");
    });

    it("should return detailed health data when requested", async () => {
      const request = new NextRequest(
        "http://localhost/api/health/optimization?detailed=true",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("services");
      expect(data).toHaveProperty("optimization");
    });

    it("should return 401 for unauthenticated user", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/health/optimization",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("error", "Unauthorized");
    });

    it("should handle service errors gracefully", async () => {
      const {
        optimizedTrading212Service,
      } = require("@/lib/optimized-trading212");
      optimizedTrading212Service.healthCheck.mockImplementation(() => {
        throw new Error("Service error");
      });

      const request = new NextRequest(
        "http://localhost/api/health/optimization",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("error");
    });
  });
});
