// Simple test to improve coverage for optimized-ai-service.ts
import { OptimizedAIService } from "@/lib/optimized-ai-service";

// Mock OpenAI to avoid constructor issues
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '{"recommendations": [{"recommendationType": "BUY"}]}',
              },
            },
          ],
        }),
      },
    },
  }));
});

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aIRecommendation: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
  retryDatabaseOperation: jest.fn((fn) => fn()),
}));

describe("OptimizedAIService - Simple Coverage Tests", () => {
  let service: OptimizedAIService;

  beforeEach(() => {
    service = new OptimizedAIService();
  });

  it("should create service instance", () => {
    expect(service).toBeInstanceOf(OptimizedAIService);
  });

  it("should have analyzePositionsBatch method", () => {
    expect(typeof service.analyzePositionsBatch).toBe("function");
  });

  it("should have getStats method", () => {
    expect(typeof service.getStats).toBe("function");
  });

  it("should have clearCache method", () => {
    expect(typeof service.clearCache).toBe("function");
  });

  it("should return stats object", () => {
    const stats = service.getStats();
    expect(typeof stats).toBe("object");
  });

  it("should handle analyzePositionsBatch with basic input", async () => {
    const mockPosition = {
      symbol: "AAPL",
      pnl: 100,
      pnlPercent: 5.2,
      quantity: 10,
      currentPrice: 150,
    };

    const result = await service.analyzePositionsBatch({
      positions: [mockPosition],
      marketData: [{ symbol: "AAPL", currentPrice: 150, changePercent: 5.2 }],
      userId: "user123",
      accountId: "account456",
      riskProfile: "MODERATE",
    });
    expect(typeof result).toBe("object");
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("should handle clearCache without errors", async () => {
    await expect(service.clearCache()).resolves.not.toThrow();
  });
});
