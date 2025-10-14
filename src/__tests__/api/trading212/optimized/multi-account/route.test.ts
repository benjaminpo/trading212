import { GET } from "../../../../../app/api/trading212/optimized/multi-account/route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { retryDatabaseOperation } from "@/lib/prisma";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}));

jest.mock("@/lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    getMultiAccountData: jest.fn(),
    getAggregatedAccountData: jest.fn(),
  },
}));

// Type the mocked functions
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRetryDatabaseOperation = retryDatabaseOperation as jest.MockedFunction<typeof retryDatabaseOperation>;
const mockOptimizedTrading212Service = optimizedTrading212Service as jest.Mocked<typeof optimizedTrading212Service>;

describe("Trading212 Multi-Account Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to ensure clean state
    mockGetServerSession.mockReset();
    mockRetryDatabaseOperation.mockReset();
    mockOptimizedTrading212Service.getMultiAccountData.mockReset();
    mockOptimizedTrading212Service.getAggregatedAccountData.mockReset();
  });

  describe("GET /api/trading212/optimized/multi-account", () => {
    it("should handle unauthorized requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle user not found", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should handle user with no Trading212 accounts", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation.mockResolvedValue({
        id: "user1",
        trading212Accounts: [],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toEqual([]);
      expect(data.aggregatedStats).toEqual({
        totalPnL: 0,
        totalPnLPercent: 0,
        todayPnL: 0,
        todayPnLPercent: 0,
        activePositions: 0,
        totalValue: 0,
        connectedAccounts: 0,
      });
    });

    it("should handle successful multi-account data retrieval without force refresh", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation
        .mockResolvedValueOnce({
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
              isDefault: true,
            },
            {
              id: "acc2",
              apiKey: "key2",
              isPractice: true,
              name: "Account 2",
              isDefault: false,
            },
          ],
        })
        .mockResolvedValueOnce(5) // AI recommendations count
        .mockResolvedValueOnce(3); // Trail stop orders count

      const mockMultiAccountData = [
        {
          accountId: "acc1",
          data: { equity: 10000, totalPnL: 500 },
          error: null,
          cacheHit: true,
        },
        {
          accountId: "acc2",
          data: { equity: 5000, totalPnL: 200 },
          error: null,
          cacheHit: false,
        },
      ];
      const mockAggregatedData = {
        totalStats: {
          totalPnL: 700,
          totalPnLPercent: 4.67,
          todayPnL: 50,
          todayPnLPercent: 0.33,
          activePositions: 15,
          totalValue: 15000,
        },
      };

      mockOptimizedTrading212Service.getMultiAccountData.mockResolvedValue(
        mockMultiAccountData,
      );
      mockOptimizedTrading212Service.getAggregatedAccountData.mockResolvedValue(
        mockAggregatedData,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(2);
      expect(data.aggregatedStats.totalPnL).toBe(700);
      expect(data.connected).toBe(true);
      expect(
        mockOptimizedTrading212Service.getMultiAccountData,
      ).toHaveBeenCalledWith(
        "user1",
        [
          { id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" },
          { id: "acc2", apiKey: "key2", isPractice: true, name: "Account 2" },
        ],
        false,
      );
    });

    it("should handle successful multi-account data retrieval with force refresh", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation
        .mockResolvedValueOnce({
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
              isDefault: true,
            },
          ],
        })
        .mockResolvedValueOnce(2); // AI recommendations count

      const mockMultiAccountData = [
        {
          accountId: "acc1",
          data: { equity: 10000, totalPnL: 500 },
          error: null,
          cacheHit: false,
        },
      ];
      const mockAggregatedData = {
        totalStats: {
          totalPnL: 500,
          totalPnLPercent: 5.0,
          todayPnL: 25,
          todayPnLPercent: 0.25,
          activePositions: 8,
          totalValue: 10000,
        },
      };

      mockOptimizedTrading212Service.getMultiAccountData.mockResolvedValue(
        mockMultiAccountData,
      );
      mockOptimizedTrading212Service.getAggregatedAccountData.mockResolvedValue(
        mockAggregatedData,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account?forceRefresh=true&includeOrders=true",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(1);
      expect(data.aggregatedStats.totalPnL).toBe(500);
      expect(data.connected).toBe(true);
      expect(
        mockOptimizedTrading212Service.getMultiAccountData,
      ).toHaveBeenCalledWith(
        "user1",
        [{ id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" }],
        true,
      );
    });

    it("should handle API errors", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation.mockResolvedValue({
        id: "user1",
        trading212Accounts: [
          {
            id: "acc1",
            apiKey: "key1",
            isPractice: false,
            name: "Account 1",
            isDefault: true,
          },
        ],
      });

      mockOptimizedTrading212Service.getMultiAccountData.mockRejectedValue(
        new Error("API Error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch multi-account data");
    });

    it("should handle database errors", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch multi-account data");
    });

    it("should handle single account scenario", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation
        .mockResolvedValueOnce({
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
              isDefault: true,
            },
          ],
        })
        .mockResolvedValueOnce(2); // AI recommendations count

      const mockMultiAccountData = [
        {
          accountId: "acc1",
          data: { equity: 10000, totalPnL: 500 },
          error: null,
          cacheHit: true,
        },
      ];
      const mockAggregatedData = {
        totalStats: {
          totalPnL: 500,
          totalPnLPercent: 5.0,
          todayPnL: 25,
          todayPnLPercent: 0.25,
          activePositions: 8,
          totalValue: 10000,
        },
      };

      mockOptimizedTrading212Service.getMultiAccountData.mockResolvedValue(
        mockMultiAccountData,
      );
      mockOptimizedTrading212Service.getAggregatedAccountData.mockResolvedValue(
        mockAggregatedData,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(1);
      expect(data.aggregatedStats.connectedAccounts).toBe(1);
      expect(data.aggregatedStats.totalValue).toBe(10000);
    });

    it("should handle accounts without default account", async () => {

      mockGetServerSession.mockResolvedValue({ user: { id: "user1" } });
      mockRetryDatabaseOperation
        .mockResolvedValueOnce({
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
              isDefault: false,
            },
            {
              id: "acc2",
              apiKey: "key2",
              isPractice: true,
              name: "Account 2",
              isDefault: false,
            },
          ],
        })
        .mockResolvedValueOnce(3) // AI recommendations count
        .mockResolvedValueOnce(2); // Trail stop orders count

      const mockMultiAccountData = [
        {
          accountId: "acc1",
          data: { equity: 10000, totalPnL: 500 },
          error: null,
          cacheHit: true,
        },
        {
          accountId: "acc2",
          data: { equity: 5000, totalPnL: 200 },
          error: null,
          cacheHit: false,
        },
      ];
      const mockAggregatedData = {
        totalStats: {
          totalPnL: 700,
          totalPnLPercent: 4.67,
          todayPnL: 50,
          todayPnLPercent: 0.33,
          activePositions: 15,
          totalValue: 15000,
        },
      };

      mockOptimizedTrading212Service.getMultiAccountData.mockResolvedValue(
        mockMultiAccountData,
      );
      mockOptimizedTrading212Service.getAggregatedAccountData.mockResolvedValue(
        mockAggregatedData,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/multi-account",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(2);
      expect(
        mockOptimizedTrading212Service.getMultiAccountData,
      ).toHaveBeenCalledWith(
        "user1",
        [
          { id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" },
          { id: "acc2", apiKey: "key2", isPractice: true, name: "Account 2" },
        ],
        false,
      );
    });
  });
});
