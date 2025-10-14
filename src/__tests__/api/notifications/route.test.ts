import { NextRequest } from "next/server";
import {
  GET,
  POST,
  createTrailStopNotification,
} from "@/app/api/notifications/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Mock dependencies - removed local NextAuth mocks to use global mocks

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn((operation) => operation()),
}));

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockedPrisma = prisma as any;

describe("/api/notifications", () => {
  const mockSession = {
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    },
  };

  const mockNotifications = [
    {
      id: "notif-1",
      userId: "test-user-id",
      type: "ai_recommendation",
      title: "New AI Recommendation - AAPL",
      message: "AI suggests selling AAPL position",
      data: null,
      isRead: false,
      createdAt: "2024-01-01T10:00:00.000Z",
      updatedAt: "2024-01-01T10:00:00.000Z",
    },
    {
      id: "notif-2",
      userId: "test-user-id",
      type: "order_executed",
      title: "✅ Order Executed",
      message: "Your order has been executed",
      data: '{"orderId": "order-123"}',
      isRead: true,
      createdAt: "2024-01-01T09:00:00.000Z",
      updatedAt: "2024-01-01T09:00:00.000Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return notifications for authenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      global.mockDb.findNotificationsByUserId.mockResolvedValue(
        mockNotifications,
      );

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ notifications: mockNotifications });
      expect(global.mockDb.findNotificationsByUserId).toHaveBeenCalledWith(
        "test-user-id",
        false,
        50,
      );
    });

    it("should filter unread notifications only when requested", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      global.mockDb.findNotificationsByUserId.mockResolvedValue([
        mockNotifications[0],
      ]);

      const request = new NextRequest(
        "http://localhost/api/notifications?unreadOnly=true",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.mockDb.findNotificationsByUserId).toHaveBeenCalledWith(
        "test-user-id",
        true,
        50,
      );
    });

    it("should respect limit parameter", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      global.mockDb.findNotificationsByUserId.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/notifications?limit=10",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.mockDb.findNotificationsByUserId).toHaveBeenCalledWith(
        "test-user-id",
        false,
        10,
      );
    });

    it("should return 401 for unauthenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should handle database errors", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      global.mockDb.findNotificationsByUserId.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch notifications" });
    });
  });

  describe("POST /api/notifications", () => {
    const validNotificationData = {
      type: "trail_stop_triggered",
      title: "Test Notification",
      message: "This is a test notification",
      data: { orderId: "order-123" },
    };

    it("should create notification for authenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      const createdNotification = {
        id: "new-notif-id",
        userId: "test-user-id",
        ...validNotificationData,
        data: JSON.stringify(validNotificationData.data),
        isRead: false,
        createdAt: "2025-09-11T13:19:15.147Z",
        updatedAt: "2025-09-11T13:19:15.147Z",
      };
      global.mockDb.createNotification.mockResolvedValue(createdNotification);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify(validNotificationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        notification: createdNotification,
        message: "Notification created successfully",
      });
      expect(global.mockDb.createNotification).toHaveBeenCalledWith({
        userId: "test-user-id",
        type: validNotificationData.type,
        title: validNotificationData.title,
        message: validNotificationData.message,
        data: JSON.stringify(validNotificationData.data),
      });
    });

    it("should create notification without data field", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      const notificationWithoutData = {
        type: "simple_notification",
        title: "Simple Test",
        message: "Simple message",
      };

      const createdNotification = {
        id: "new-notif-id",
        userId: "test-user-id",
        ...notificationWithoutData,
        data: null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      global.mockDb.createNotification.mockResolvedValue(createdNotification);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify(notificationWithoutData),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(global.mockDb.createNotification).toHaveBeenCalledWith({
        userId: "test-user-id",
        type: notificationWithoutData.type,
        title: notificationWithoutData.title,
        message: notificationWithoutData.message,
        data: undefined,
      });
    });

    it("should return 400 for missing required fields", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);

      const invalidData = {
        type: "test",
        // Missing title and message
      };

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Type, title, and message are required" });
    });

    it("should return 401 for unauthenticated user", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify(validNotificationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should handle database errors", async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any);
      global.mockDb.createNotification.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify(validNotificationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to create notification" });
    });
  });
});
