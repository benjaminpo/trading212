import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "@/app/api/trail-stop/orders/[orderId]/route";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    trailStopLossOrder: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

describe("/api/trail-stop/orders/[orderId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
    });
  });

  describe("GET", () => {
    it("returns trail stop order when found", async () => {
      const mockOrder = {
        id: "1",
        userId: "user1",
        accountId: "account1",
        symbol: "AAPL",
        quantity: 100,
        currentPrice: 150.0,
        trailAmount: 5.0,
        trailPercent: 3.33,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(mockOrder);

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
      );
      const response = await GET(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.order).toEqual({
        ...mockOrder,
        createdAt: mockOrder.createdAt.toISOString(),
        updatedAt: mockOrder.updatedAt.toISOString(),
      });
    });

    it("returns 404 when order not found", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/999",
      );
      const response = await GET(request, {
        params: Promise.resolve({ orderId: "999" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Order not found");
    });

    it("handles database errors", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
      );
      const response = await GET(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to fetch order");
    });
  });

  describe("PUT", () => {
    const mockOrder = {
      id: "1",
      userId: "user1",
      accountId: "account1",
      symbol: "AAPL",
      quantity: 100,
      currentPrice: 150,
      trailAmount: 5,
      trailPercent: 3.33,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("updates trail stop order successfully", async () => {
      const mockUpdatedOrder = {
        id: "1",
        userId: "user1",
        accountId: "account1",
        symbol: "AAPL",
        quantity: 100,
        currentPrice: 150.0,
        trailAmount: 7.5,
        trailPercent: 5.0,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(mockOrder);
      prisma.trailStopLossOrder.update.mockResolvedValue(mockUpdatedOrder);

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
        {
          method: "PUT",
          body: JSON.stringify({ trailAmount: 7.5, trailPercent: 5.0 }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.order).toEqual({
        ...mockUpdatedOrder,
        createdAt: mockUpdatedOrder.createdAt.toISOString(),
        updatedAt: mockUpdatedOrder.updatedAt.toISOString(),
      });
    });

    it("handles invalid request body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
        {
          method: "PUT",
          body: "invalid json",
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to update order");
    });

    it("handles database errors", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(mockOrder);
      prisma.trailStopLossOrder.update.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
        {
          method: "PUT",
          body: JSON.stringify({ trailAmount: 7.5 }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to update order");
    });
  });

  describe("DELETE", () => {
    const mockOrder = {
      id: "1",
      userId: "user1",
      accountId: "account1",
      symbol: "AAPL",
      quantity: 100,
      currentPrice: 150,
      trailAmount: 5,
      trailPercent: 3.33,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deletes trail stop order successfully", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(mockOrder);
      prisma.trailStopLossOrder.delete.mockResolvedValue({ id: "1" });

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Trail stop order deleted successfully");
    });

    it("handles database errors", async () => {
      const { prisma } = require("@/lib/prisma");
      prisma.trailStopLossOrder.findFirst.mockResolvedValue(mockOrder);
      prisma.trailStopLossOrder.delete.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/trail-stop/orders/1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ orderId: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to delete order");
    });
  });
});
