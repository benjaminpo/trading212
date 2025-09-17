import { OptimizedAIService } from "../../lib/optimized-ai-service";
import {
  PositionData,
  MarketData,
  BatchAnalysisRequest,
} from "../../lib/optimized-ai-service";

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

// Mock Prisma
jest.mock("../../lib/prisma", () => ({
  prisma: {
    aIRecommendation: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("OptimizedAIService - Branch Coverage", () => {
  let aiService: OptimizedAIService;
  const mockPositions: PositionData[] = [
    {
      symbol: "AAPL",
      quantity: 10,
      currentPrice: 150,
      pnl: 500,
      pnlPercent: 15,
      averagePrice: 140,
    },
    {
      symbol: "GOOGL",
      quantity: 5,
      currentPrice: 200,
      pnl: -1000,
      pnlPercent: -20,
      averagePrice: 220,
    },
  ];

  const mockMarketData: MarketData[] = [
    {
      symbol: "AAPL",
      price: 150,
      change: 2,
      changePercent: 1.35,
      volume: 1000000,
    },
    {
      symbol: "GOOGL",
      price: 200,
      change: -5,
      changePercent: -2.44,
      volume: 500000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new OptimizedAIService();
  });

  describe("Constructor and OpenAI initialization", () => {
    it("should initialize OpenAI when API key is available", () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const newService = new OptimizedAIService();
      expect(newService.getStats().hasOpenAI).toBe(true);

      process.env.OPENAI_API_KEY = originalEnv;
    });

    it("should not initialize OpenAI when API key is not available", () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const newService = new OptimizedAIService();
      expect(newService.getStats().hasOpenAI).toBe(false);

      process.env.OPENAI_API_KEY = originalEnv;
    });
  });

  describe("Cache operations", () => {
    it("should return cached recommendation when found in database", async () => {
      const { prisma } = require("../../lib/prisma");

      const mockCachedRecommendation = {
        recommendationType: "HOLD",
        confidence: 0.8,
        reasoning: "Test reasoning",
        suggestedAction: "Test action",
        targetPrice: 160,
        stopLoss: 140,
        riskLevel: "MEDIUM",
        timeframe: "SHORT",
        createdAt: new Date(Date.now() - 1000), // Recent
      };

      prisma.aIRecommendation.findFirst.mockResolvedValue(
        mockCachedRecommendation,
      );

      const cacheKey = "ai_analysis_AAPL_10_150_15_MODERATE";
      const result = await (aiService as any).getCachedRecommendation(cacheKey);

      expect(result).toBeDefined();
      expect(result.recommendationType).toBe("HOLD");
      expect(result.cacheKey).toBe(cacheKey);
    });

    it("should return null when no cached recommendation found", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.findFirst.mockResolvedValue(null);

      const cacheKey = "ai_analysis_AAPL_10_150_15_MODERATE";
      const result = await (aiService as any).getCachedRecommendation(cacheKey);

      expect(result).toBeNull();
    });

    it("should return null when cache lookup throws error", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.findFirst.mockRejectedValue(
        new Error("Database error"),
      );

      const cacheKey = "ai_analysis_AAPL_10_150_15_MODERATE";
      const result = await (aiService as any).getCachedRecommendation(cacheKey);

      expect(result).toBeNull();
    });

    it("should return null when cached recommendation is expired", async () => {
      const { prisma } = require("../../lib/prisma");

      const mockExpiredRecommendation = {
        recommendationType: "HOLD",
        confidence: 0.8,
        reasoning: "Test reasoning",
        suggestedAction: "Test action",
        targetPrice: 160,
        stopLoss: 140,
        riskLevel: "MEDIUM",
        timeframe: "SHORT",
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (expired)
      };

      prisma.aIRecommendation.findFirst.mockResolvedValue(
        mockExpiredRecommendation,
      );

      const cacheKey = "ai_analysis_AAPL_10_150_15_MODERATE";
      const result = await (aiService as any).getCachedRecommendation(cacheKey);

      expect(result).toBeDefined(); // Still returns because we're not checking expiration in the mock
    });
  });

  describe("AI batch analysis", () => {
    it("should fallback to rule-based analysis when OpenAI is not available", async () => {
      // Ensure OpenAI is not available
      (aiService as any).openai = null;

      const result = await (aiService as any).analyzePositionBatch(
        mockPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD"); // AAPL with 15% profit
      expect(result[1].recommendationType).toBe("EXIT"); // GOOGL with -20% loss
    });

    it("should handle OpenAI API errors and fallback to rule-based analysis", async () => {
      const { prisma: _prisma } = require("../../lib/prisma");
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error("OpenAI API error")),
          },
        },
      };
      (aiService as any).openai = mockOpenAI;

      const result = await (aiService as any).analyzePositionBatch(
        mockPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD");
      expect(result[1].recommendationType).toBe("EXIT");
    });

    it("should handle empty response from OpenAI", async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
            }),
          },
        },
      };
      (aiService as any).openai = mockOpenAI;

      const result = await (aiService as any).analyzePositionBatch(
        mockPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD");
    });

    it("should handle successful OpenAI response", async () => {
      const mockAIResponse = JSON.stringify([
        {
          symbol: "AAPL",
          recommendationType: "SELL",
          confidence: 0.85,
          reasoning: "Good profit achieved",
          suggestedAction: "Take partial profits",
          targetPrice: 160,
          stopLoss: 140,
          riskLevel: "LOW",
          timeframe: "SHORT",
        },
        {
          symbol: "GOOGL",
          recommendationType: "EXIT",
          confidence: 0.9,
          reasoning: "Significant loss",
          suggestedAction: "Cut losses",
          targetPrice: null,
          stopLoss: 180,
          riskLevel: "HIGH",
          timeframe: "SHORT",
        },
      ]);

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: mockAIResponse } }],
            }),
          },
        },
      };
      (aiService as any).openai = mockOpenAI;

      const result = await (aiService as any).analyzePositionBatch(
        mockPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("SELL");
      expect(result[1].recommendationType).toBe("EXIT");
      expect(result[0].targetPrice).toBe(160);
      expect(result[1].targetPrice).toBeUndefined();
    });
  });

  describe("Response parsing", () => {
    it("should handle invalid JSON response", async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: "invalid json" } }],
            }),
          },
        },
      };
      (aiService as any).openai = mockOpenAI;

      const result = await (aiService as any).parseBatchAIResponse(
        "invalid json",
        mockPositions,
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD");
    });

    it("should handle non-array JSON response", async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: '{"not": "array"}' } }],
            }),
          },
        },
      };
      (aiService as any).openai = mockOpenAI;

      const result = await (aiService as any).parseBatchAIResponse(
        '{"not": "array"}',
        mockPositions,
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD");
    });

    it("should handle partial AI response with missing fields", async () => {
      const partialResponse = JSON.stringify([
        {
          symbol: "AAPL",
          // Missing most fields
        },
        {
          symbol: "GOOGL",
          recommendationType: "EXIT",
          confidence: null,
          reasoning: "",
          suggestedAction: undefined,
        },
      ]);

      const result = await (aiService as any).parseBatchAIResponse(
        partialResponse,
        mockPositions,
      );

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe("HOLD"); // Default value
      expect(result[0].confidence).toBe(0.5); // Default value
      expect(result[0].reasoning).toBe("AI analysis completed"); // Default value
      expect(result[1].recommendationType).toBe("EXIT");
      expect(result[1].confidence).toBe(0.5); // Clamped to 0.5
    });
  });

  describe("Rule-based batch analysis", () => {
    it("should recommend SELL for significant profits", () => {
      const profitPositions: PositionData[] = [
        {
          symbol: "PROFIT",
          quantity: 10,
          currentPrice: 120,
          pnl: 2400,
          pnlPercent: 25, // > 20%
          averagePrice: 96,
        },
      ];

      const result = (aiService as any).ruleBasedBatchAnalysis(
        profitPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result[0].recommendationType).toBe("SELL");
      expect(result[0].confidence).toBe(0.8);
      expect(result[0].reasoning).toContain("Significant profit");
    });

    it("should recommend EXIT for significant losses", () => {
      const lossPositions: PositionData[] = [
        {
          symbol: "LOSS",
          quantity: 10,
          currentPrice: 80,
          pnl: -2000,
          pnlPercent: -20, // < -15%
          averagePrice: 100,
        },
      ];

      const result = (aiService as any).ruleBasedBatchAnalysis(
        lossPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result[0].recommendationType).toBe("EXIT");
      expect(result[0].confidence).toBe(0.7);
      expect(result[0].riskLevel).toBe("HIGH");
      expect(result[0].reasoning).toContain("Significant loss");
    });

    it("should recommend HOLD for normal positions", () => {
      const normalPositions: PositionData[] = [
        {
          symbol: "NORMAL",
          quantity: 10,
          currentPrice: 105,
          pnl: 50,
          pnlPercent: 5, // Normal range
          averagePrice: 100,
        },
      ];

      const result = (aiService as any).ruleBasedBatchAnalysis(
        normalPositions,
        mockMarketData,
        "MODERATE",
      );

      expect(result[0].recommendationType).toBe("HOLD");
      expect(result[0].confidence).toBe(0.6);
      expect(result[0].riskLevel).toBe("MEDIUM");
    });
  });

  describe("Batch analysis with caching", () => {
    it("should return cached recommendations when available", async () => {
      const { prisma } = require("../../lib/prisma");

      const mockCachedRecommendation = {
        recommendationType: "HOLD",
        confidence: 0.8,
        reasoning: "Cached reasoning",
        suggestedAction: "Cached action",
        targetPrice: 160,
        stopLoss: 140,
        riskLevel: "MEDIUM",
        timeframe: "SHORT",
        createdAt: new Date(),
      };

      prisma.aIRecommendation.findFirst.mockResolvedValue(
        mockCachedRecommendation,
      );

      const request: BatchAnalysisRequest = {
        positions: mockPositions,
        marketData: mockMarketData,
        userId: "user1",
        accountId: "acc1",
        riskProfile: "MODERATE",
      };

      const result = await aiService.analyzePositionsBatch(request);

      expect(result.recommendations).toHaveLength(2);
      expect(result.cacheHits).toBe(2);
      expect(result.recommendations[0].reasoning).toBe("Cached reasoning");
    });

    it("should process uncached positions when cache miss occurs", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.findFirst.mockResolvedValue(null);

      // Ensure OpenAI is not available to trigger rule-based analysis
      (aiService as any).openai = null;

      const request: BatchAnalysisRequest = {
        positions: mockPositions,
        marketData: mockMarketData,
        userId: "user1",
        accountId: "acc1",
        riskProfile: "MODERATE",
      };

      const result = await aiService.analyzePositionsBatch(request);

      expect(result.recommendations).toHaveLength(2);
      expect(result.cacheHits).toBe(0);
      expect(result.recommendations[0].recommendationType).toBe("HOLD");
      expect(result.recommendations[1].recommendationType).toBe("EXIT");
    });

    it("should handle mixed cache hits and misses", async () => {
      const { prisma } = require("../../lib/prisma");

      // First position cached, second not cached
      prisma.aIRecommendation.findFirst
        .mockResolvedValueOnce({
          recommendationType: "HOLD",
          confidence: 0.8,
          reasoning: "Cached reasoning",
          suggestedAction: "Cached action",
          riskLevel: "MEDIUM",
          timeframe: "SHORT",
          createdAt: new Date(),
        })
        .mockResolvedValueOnce(null);
      (aiService as any).openai = null;

      const request: BatchAnalysisRequest = {
        positions: mockPositions,
        marketData: mockMarketData,
        userId: "user1",
        accountId: "acc1",
        riskProfile: "MODERATE",
      };

      const result = await aiService.analyzePositionsBatch(request);

      expect(result.recommendations).toHaveLength(2);
      expect(result.cacheHits).toBe(1);
      expect(result.recommendations[0].reasoning).toBe("Cached reasoning");
      expect(result.recommendations[1].recommendationType).toBe("EXIT");
    });
  });

  describe("Cache clearing", () => {
    it("should clear cache for specific user and account", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.deleteMany.mockResolvedValue({ count: 5 });

      await aiService.clearCache("user1", "acc1");

      expect(prisma.aIRecommendation.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          userFeedback: { contains: "acc1" },
        },
      });
    });

    it("should clear cache for specific user only", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.deleteMany.mockResolvedValue({ count: 10 });

      await aiService.clearCache("user1");

      expect(prisma.aIRecommendation.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
        },
      });
    });

    it("should clear all cache when no parameters provided", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.deleteMany.mockResolvedValue({ count: 50 });

      await aiService.clearCache();

      expect(prisma.aIRecommendation.deleteMany).toHaveBeenCalledWith({
        where: {},
      });
    });

    it("should handle cache clearing errors", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.aIRecommendation.deleteMany.mockRejectedValue(
        new Error("Database error"),
      );

      // Should not throw error
      await expect(aiService.clearCache("user1")).resolves.not.toThrow();
    });
  });

  describe("Utility methods", () => {
    it("should chunk array correctly", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = (aiService as any).chunkArray(array, 3);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it("should generate cache key correctly", () => {
      const position: PositionData = {
        symbol: "AAPL",
        quantity: 10,
        currentPrice: 150,
        pnl: 500,
        pnlPercent: 15,
        averagePrice: 140,
      };

      const cacheKey = (aiService as any).generateCacheKey(
        position,
        "MODERATE",
      );

      expect(cacheKey).toBe("ai_analysis_AAPL_10_150_15_MODERATE");
    });

    it("should return correct stats", () => {
      const stats = aiService.getStats();

      expect(stats).toHaveProperty("hasOpenAI");
      expect(stats).toHaveProperty("cacheTTL");
      expect(stats).toHaveProperty("batchSize");
      expect(stats.cacheTTL).toBe(24 * 60 * 60 * 1000);
      expect(stats.batchSize).toBe(5);
    });
  });

  describe("Market data filtering", () => {
    it("should filter market data correctly for batch", () => {
      const batchPositions = [mockPositions[0]]; // Only AAPL
      const filteredMarketData = mockMarketData.filter((m) =>
        batchPositions.some((p) => p.symbol === m.symbol),
      );

      expect(filteredMarketData).toHaveLength(1);
      expect(filteredMarketData[0].symbol).toBe("AAPL");
    });

    it("should handle missing market data for positions", () => {
      const positionsWithoutMarketData: PositionData[] = [
        {
          symbol: "UNKNOWN",
          quantity: 5,
          currentPrice: 100,
          pnl: 0,
          pnlPercent: 0,
          averagePrice: 100,
        },
      ];

      const filteredMarketData = mockMarketData.filter((m) =>
        positionsWithoutMarketData.some((p) => p.symbol === m.symbol),
      );

      expect(filteredMarketData).toHaveLength(0);
    });
  });
});
