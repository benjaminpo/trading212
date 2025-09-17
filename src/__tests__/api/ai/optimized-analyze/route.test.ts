import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/ai/optimized-analyze/route";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    aIRecommendation: {
      findMany: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn((fn) => fn()),
}));

// Mock optimization services
jest.mock("@/lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    getMultiAccountData: jest.fn().mockResolvedValue([
      {
        accountId: "account1",
        data: {
          portfolio: [{ ticker: "AAPL", quantity: 100, pnl: 1000 }],
          stats: { totalPnL: 1000, activePositions: 1 },
        },
      },
    ]),
  },
}));

jest.mock("@/lib/optimized-ai-service", () => ({
  optimizedAIService: {
    analyzePositionsBatch: jest.fn().mockResolvedValue({
      recommendations: [
        {
          ticker: "AAPL",
          recommendationType: "HOLD",
          confidence: 0.8,
          reasoning: "Test reasoning",
        },
      ],
      analysisTime: 100,
    }),
  },
}));

describe("/api/ai/optimized-analyze", () => {
  const mockSession = {
    user: {
      id: "user123",
    },
  };

  const mockUser = {
    id: "user123",
    trading212Accounts: [
      {
        id: "account1",
        name: "Test Account",
        apiKey: "test-api-key",
        isPractice: true,
        isDefault: true,
      },
    ],
  };

  beforeEach(() => {
    const { getServerSession } = require("next-auth");
    const { prisma } = require("@/lib/prisma");

    getServerSession.mockResolvedValue(mockSession);
    prisma.user.findUnique.mockResolvedValue(mockUser);
    if (prisma.aIRecommendation?.findMany) {
      prisma.aIRecommendation.findMany.mockResolvedValue([]);
    }
  });

  describe("POST", () => {
    it("should perform batch analysis for all accounts", async () => {
      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({ analysisType: "BATCH_ANALYSIS" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("recommendations");
      expect(data).toHaveProperty("summary");
      expect(data.summary).toHaveProperty("accountsAnalyzed");
      expect(data.summary).toHaveProperty("executionTime");
    });

    it("should perform analysis for specific account", async () => {
      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({
            analysisType: "BATCH_ANALYSIS",
            accountId: "account1",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("recommendations");
      expect(data).toHaveProperty("summary");
      expect(data.summary).toHaveProperty("accountsAnalyzed");
    });

    it("should return 401 for unauthenticated user", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({ analysisType: "BATCH_ANALYSIS" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("error", "Unauthorized");
    });

    it("should return 400 when no accounts found", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        trading212Accounts: [],
      });

      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({ analysisType: "BATCH_ANALYSIS" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty(
        "error",
        "No active Trading212 accounts found",
      );
    });

    it("should return 404 when specific account not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({
            analysisType: "BATCH_ANALYSIS",
            accountId: "nonexistent",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error", "Account not found");
    });

    it("should handle service errors gracefully", async () => {
      const { optimizedAIService } = require("@/lib/optimized-ai-service");
      optimizedAIService.analyzePositionsBatch.mockRejectedValue(
        new Error("Analysis failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
        {
          method: "POST",
          body: JSON.stringify({ analysisType: "BATCH_ANALYSIS" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("recommendations");
    });
  });

  describe("GET", () => {
    const makeRec = (overrides: Partial<any> = {}) => {
      const base = {
        id: "id",
        userId: "user123",
        positionId: "p",
        symbol: "SYM",
        isActive: true,
        createdAt: new Date(),
        userFeedback: JSON.stringify({ accountId: "account1" }),
        position: {},
      };
      return { ...base, ...overrides };
    };
    it("should dedupe recommendations by symbol keeping the latest", async () => {
      const { prisma } = require("@/lib/prisma");
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(mockSession);

      const now = new Date();
      const recs = [
        makeRec({
          id: "1",
          symbol: "GOOGL_US_EQ",
          createdAt: new Date(now.getTime() - 1000),
        }),
        makeRec({ id: "2", symbol: "GOOGL_US_EQ", createdAt: now }),
        makeRec({ id: "3", symbol: "AAPL_US_EQ", createdAt: now }),
      ];

      prisma.aIRecommendation.findMany.mockResolvedValue(recs);

      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(2);
      const symbols = data.recommendations.map((r: any) => r.symbol);
      expect(symbols.sort()).toEqual(["AAPL_US_EQ", "GOOGL_US_EQ"]);
      const googl = data.recommendations.find(
        (r: any) => r.symbol === "GOOGL_US_EQ",
      );
      expect(googl.id).toBe("2");
    });

    it("should filter recommendations by accountId and then dedupe", async () => {
      const { prisma } = require("@/lib/prisma");
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(mockSession);

      const now = new Date();
      const recs = [
        makeRec({
          id: "1",
          symbol: "GOOGL_US_EQ",
          createdAt: new Date(now.getTime() - 2000),
          userFeedback: JSON.stringify({ accountId: "accountA" }),
        }),
        makeRec({
          id: "2",
          symbol: "GOOGL_US_EQ",
          createdAt: new Date(now.getTime() - 1000),
          userFeedback: JSON.stringify({ accountId: "accountB" }),
        }),
        makeRec({
          id: "3",
          symbol: "AAPL_US_EQ",
          createdAt: now,
          userFeedback: JSON.stringify({ accountId: "accountA" }),
        }),
      ];

      prisma.aIRecommendation.findMany.mockResolvedValue(recs);

      const request = new NextRequest(
        "http://localhost/api/ai/optimized-analyze?accountId=accountA",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // After filtering to accountA, we have ids 1 and 3, dedupe keeps both since symbols differ
      expect(data.recommendations).toHaveLength(2);
      const symbols = data.recommendations.map((r: any) => r.symbol).sort();
      expect(symbols).toEqual(["AAPL_US_EQ", "GOOGL_US_EQ"]);
      const googl = data.recommendations.find(
        (r: any) => r.symbol === "GOOGL_US_EQ",
      );
      expect(googl.id).toBe("1");
    });
  });
});
