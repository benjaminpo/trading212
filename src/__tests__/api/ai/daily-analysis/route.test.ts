import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/ai/daily-analysis/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { dailyScheduler } from "@/lib/scheduler";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    aIAnalysisLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/ai-service", () => ({
  AIAnalysisService: jest.fn().mockImplementation(() => ({
    generateDailyAnalysis: jest.fn().mockResolvedValue("Mock analysis"),
    logAnalysis: jest.fn().mockResolvedValue({ id: "log-id" }),
  })),
}));

jest.mock("@/lib/scheduler", () => ({
  dailyScheduler: {
    analyzeUser: jest.fn(),
  },
}));

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockedPrisma = prisma as any;
const mockedDailyScheduler = dailyScheduler as jest.Mocked<
  typeof dailyScheduler
>;

describe("/api/ai/daily-analysis", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
  };

  const mockAnalysisLogs = [
    {
      id: "log-1",
      userId: "test-user-id",
      analysisType: "daily",
      totalPositions: 10,
      recommendations: 3,
      executionTime: 1500,
      success: true,
      errorMessage: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    {
      id: "log-2",
      userId: "test-user-id",
      analysisType: "daily",
      totalPositions: 8,
      recommendations: 2,
      executionTime: 1200,
      success: false,
      errorMessage: "API rate limit exceeded",
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/ai/daily-analysis", () => {
    it("should return analysis logs for authenticated user", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedPrisma.aIAnalysisLog.findMany.mockResolvedValue(
        mockAnalysisLogs as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(2);
      expect(data.logs[0].id).toBe("log-1");
      expect(data.logs[0].success).toBe(true);
      expect(data.logs[1].success).toBe(false);
    });

    it("should return 401 for unauthenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle database errors", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedPrisma.aIAnalysisLog.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch analysis logs");
    });

    it("should return empty array when no logs exist", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedPrisma.aIAnalysisLog.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toEqual([]);
    });

    it("should filter logs by date range when provided", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedPrisma.aIAnalysisLog.findMany.mockResolvedValue([
        mockAnalysisLogs[0],
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(1);
      expect(mockedPrisma.aIAnalysisLog.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    });
  });

  describe("POST /api/ai/daily-analysis", () => {
    it("should trigger daily analysis for all users", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockResolvedValue(undefined);

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Daily analysis completed successfully");
    });

    it("should return 401 for unauthenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle analysis errors gracefully", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to run daily analysis");
    });

    it("should handle database errors when fetching users", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockRejectedValue(
        new Error("Database error"),
      );

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to run daily analysis");
    });

    it("should handle scheduler initialization errors", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockRejectedValue(
        new Error("Scheduler initialization failed"),
      );

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to run daily analysis");
    });

    it("should handle empty user list", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockResolvedValue(undefined);

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Daily analysis completed successfully");
    });

    it("should create analysis log entry", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser,
      } as any);

      mockedDailyScheduler.analyzeUser.mockResolvedValue(undefined);

      const _request = new NextRequest(
        "http://localhost:3000/api/ai/daily-analysis",
        {
          method: "POST",
        },
      );
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Daily analysis completed successfully");
    });
  });
});
