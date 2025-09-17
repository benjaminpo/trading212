import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/daily-pnl/route";
import { getServerSession } from "next-auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyPnL: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}));
jest.mock("@/lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    canMakeRequest: jest.fn(),
    getAccountData: jest.fn(),
    forceRefreshAccountData: jest.fn(),
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockRetryDatabaseOperation =
  retryDatabaseOperation as jest.MockedFunction<typeof retryDatabaseOperation>;
const mockPrisma = prisma as any;
const mockOptimizedTrading212Service = optimizedTrading212Service as any;

describe("/api/daily-pnl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if no session", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 if no user id", async () => {
      mockGetServerSession.mockResolvedValue({ user: {} } as any);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should fetch daily P/L data with default parameters", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockDailyPnL = [
        {
          id: "1",
          userId: "user1",
          accountId: "acc1",
          date: new Date("2024-01-01"),
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          cash: 5000,
          currency: "USD",
          positions: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "user1",
          accountId: "acc1",
          date: new Date("2024-01-02"),
          totalPnL: 1100,
          todayPnL: 200,
          totalValue: 10100,
          cash: 5100,
          currency: "USD",
          positions: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.dailyPnL.findMany.mockResolvedValue(mockDailyPnL);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dailyPnL).toHaveLength(2);
      expect(data.summary.totalDays).toBe(2);
      expect(data.summary.totalPnLChange).toBe(-100); // 1000 - 1100
      expect(data.summary.bestDay.todayPnL).toBe(200);
      expect(data.summary.worstDay.todayPnL).toBe(100);
      expect(data.summary.averageDailyPnL).toBe(150); // (100 + 200) / 2
    });

    it("should handle empty daily P/L data", async () => {
      const mockSession = { user: { id: "user1" } };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.dailyPnL.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dailyPnL).toHaveLength(0);
      expect(data.summary.totalDays).toBe(0);
      expect(data.summary.totalPnLChange).toBe(0);
      expect(data.summary.bestDay).toBeNull();
      expect(data.summary.worstDay).toBeNull();
      expect(data.summary.averageDailyPnL).toBe(0);
    });

    it("should handle single day data", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockDailyPnL = [
        {
          id: "1",
          userId: "user1",
          accountId: "acc1",
          date: new Date("2024-01-01"),
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          cash: 5000,
          currency: "USD",
          positions: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.dailyPnL.findMany.mockResolvedValue(mockDailyPnL);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalPnLChange).toBe(0); // Only one day
      expect(data.summary.bestDay.todayPnL).toBe(100);
      expect(data.summary.worstDay.todayPnL).toBe(100);
    });

    it("should handle database error gracefully", async () => {
      const mockSession = { user: { id: "user1" } };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dailyPnL).toHaveLength(0);
      expect(data.summary.totalDays).toBe(0);
    });

    it("should handle custom parameters", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockDailyPnL = [
        {
          id: "1",
          userId: "user1",
          accountId: "acc1",
          date: new Date("2024-01-01"),
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          cash: 5000,
          currency: "USD",
          positions: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.dailyPnL.findMany.mockResolvedValue(mockDailyPnL);

      const request = new NextRequest(
        "http://localhost:3000/api/daily-pnl?accountId=acc1&days=7&startDate=2024-01-01&endDate=2024-01-07",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.dailyPnL.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          date: {
            gte: new Date("2024-01-01"),
            lte: new Date("2024-01-07"),
          },
          accountId: "acc1",
        },
        orderBy: { date: "desc" },
        take: 7,
      });
    });

    it("should handle unexpected errors", async () => {
      mockGetServerSession.mockRejectedValue(new Error("Unexpected error"));

      const request = new NextRequest("http://localhost:3000/api/daily-pnl");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch daily P/L data");
    });
  });

  describe("POST", () => {
    it("should return 401 if no session", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if no active accounts", async () => {
      const mockSession = { user: { id: "user1" } };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No active Trading212 accounts found");
    });

    it("should create new daily P/L record", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockAccount = {
        id: "acc1",
        name: "Test Account",
        apiKey: "test-key",
        isPractice: false,
      };
      const mockAccountData = {
        account: { cash: 5000, currencyCode: "USD" },
        stats: {
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          activePositions: 5,
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [mockAccount],
      } as any);
      mockOptimizedTrading212Service.canMakeRequest.mockReturnValue(true);
      mockOptimizedTrading212Service.getAccountData.mockResolvedValue(
        mockAccountData,
      );
      mockPrisma.dailyPnL.findUnique.mockResolvedValue(null);
      mockPrisma.dailyPnL.create.mockResolvedValue({
        id: "1",
        userId: "user1",
        accountId: "acc1",
        date: new Date(),
        totalPnL: 1000,
        todayPnL: 100,
        totalValue: 10000,
        cash: 5000,
        currency: "USD",
        positions: 5,
      });

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Daily P/L snapshots captured");
      expect(data.results).toHaveLength(1);
      expect(data.results[0].action).toBe("created");
    });

    it("should update existing daily P/L record", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockAccount = {
        id: "acc1",
        name: "Test Account",
        apiKey: "test-key",
        isPractice: false,
      };
      const mockAccountData = {
        account: { cash: 5000, currencyCode: "USD" },
        stats: {
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          activePositions: 5,
        },
      };
      const mockExistingRecord = {
        id: "1",
        userId: "user1",
        accountId: "acc1",
        date: new Date(),
        totalPnL: 900,
        todayPnL: 50,
        totalValue: 9500,
        cash: 4500,
        currency: "USD",
        positions: 4,
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [mockAccount],
      } as any);
      mockOptimizedTrading212Service.canMakeRequest.mockReturnValue(true);
      mockOptimizedTrading212Service.getAccountData.mockResolvedValue(
        mockAccountData,
      );
      mockPrisma.dailyPnL.findUnique.mockResolvedValue(mockExistingRecord);
      mockPrisma.dailyPnL.update.mockResolvedValue({
        ...mockExistingRecord,
        totalPnL: 1000,
        todayPnL: 100,
      });

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].action).toBe("updated");
    });

    it("should skip rate limited accounts", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockAccount = {
        id: "acc1",
        name: "Test Account",
        apiKey: "test-key",
        isPractice: false,
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [mockAccount],
      } as any);
      mockOptimizedTrading212Service.canMakeRequest.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(0);
    });

    it("should handle force refresh", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockAccount = {
        id: "acc1",
        name: "Test Account",
        apiKey: "test-key",
        isPractice: false,
      };
      const mockAccountData = {
        account: { cash: 5000, currencyCode: "USD" },
        stats: {
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          activePositions: 5,
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [mockAccount],
      } as any);
      mockOptimizedTrading212Service.canMakeRequest.mockReturnValue(true);
      mockOptimizedTrading212Service.forceRefreshAccountData.mockResolvedValue(
        mockAccountData,
      );
      mockPrisma.dailyPnL.findUnique.mockResolvedValue(null);
      mockPrisma.dailyPnL.create.mockResolvedValue({
        id: "1",
        userId: "user1",
        accountId: "acc1",
        date: new Date(),
        totalPnL: 1000,
        todayPnL: 100,
        totalValue: 10000,
        cash: 5000,
        currency: "USD",
        positions: 5,
      });

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1", forceRefresh: true }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        mockOptimizedTrading212Service.forceRefreshAccountData,
      ).toHaveBeenCalledWith("user1", "acc1", "test-key", false);
    });

    it("should handle database errors during creation", async () => {
      const mockSession = { user: { id: "user1" } };
      const mockAccount = {
        id: "acc1",
        name: "Test Account",
        apiKey: "test-key",
        isPractice: false,
      };
      const mockAccountData = {
        account: { cash: 5000, currencyCode: "USD" },
        stats: {
          totalPnL: 1000,
          todayPnL: 100,
          totalValue: 10000,
          activePositions: 5,
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRetryDatabaseOperation.mockImplementation((fn) => fn());
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [mockAccount],
      } as any);
      mockOptimizedTrading212Service.canMakeRequest.mockReturnValue(true);
      mockOptimizedTrading212Service.getAccountData.mockResolvedValue(
        mockAccountData,
      );
      mockPrisma.dailyPnL.findUnique.mockResolvedValue(null);
      mockPrisma.dailyPnL.create.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].action).toBe("error");
      expect(data.results[0].error).toBe("Database error");
    });

    it("should handle unexpected errors", async () => {
      mockGetServerSession.mockRejectedValue(new Error("Unexpected error"));

      const request = new NextRequest("http://localhost:3000/api/daily-pnl", {
        method: "POST",
        body: JSON.stringify({ accountId: "acc1" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to capture daily P/L data");
    });
  });
});
