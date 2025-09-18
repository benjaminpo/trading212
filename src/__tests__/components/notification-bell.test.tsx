import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationBell from "@/components/notification-bell";
import logger from "@/lib/logger";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock logger methods to match app logging
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockConsoleLog = jest
  .spyOn(logger, "info")
  .mockImplementation(() => {});

describe("NotificationBell", () => {
  const mockNotifications = [
    {
      id: "notif-1",
      type: "trail_stop_triggered",
      title: "🚨 Trail Stop Triggered - AAPL",
      message: "Your trail stop order has been triggered",
      isRead: false,
      createdAt: "2024-01-01T10:00:00Z",
    },
    {
      id: "notif-2",
      type: "order_executed",
      title: "✅ Order Executed - GOOGL",
      message: "Your order has been executed successfully",
      isRead: false,
      createdAt: "2024-01-01T09:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    } as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
    mockConsoleError.mockClear();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it("should render notification bell with unread count", async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // Unread count badge
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications?unreadOnly=true&limit=10",
    );
  });

  it("should not show badge when no unread notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [] }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it('should show "9+" for more than 9 notifications', async () => {
    const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
      id: `notif-${i}`,
      type: "test",
      title: `Notification ${i}`,
      message: "Test message",
      isRead: false,
      createdAt: "2024-01-01T10:00:00Z",
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: manyNotifications }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  it("should show loading state initially", () => {
    // Mock fetch to not resolve immediately
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<NotificationBell />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should handle click and show notifications in console", async () => {
    // Mock window.alert
    const mockAlert = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<NotificationBell />);

    // Wait for notifications to load and badge to appear
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button"));

    expect(mockConsoleLog).toHaveBeenCalledWith(
      "Notifications:",
      mockNotifications,
    );
    expect(mockAlert).toHaveBeenCalledWith(
      "You have 2 unread notifications. Check the console for details.",
    );

    mockAlert.mockRestore();
  });

  it("should handle API error gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      "Error loading notifications:",
      expect.any(Error),
    );
  });

  it("should handle API response error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    // Should not crash and should show 0 notifications
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("should poll for new notifications every 30 seconds", async () => {
    render(<NotificationBell />);

    // Initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Fast forward another 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it("should cleanup interval on unmount", async () => {
    const { unmount } = render(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Fast forward time - should not make additional requests
    jest.advanceTimersByTime(60000);

    // Should still be only 1 call (no additional calls after unmount)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle null/undefined notifications response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: null }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    // Should handle null gracefully and show no badge
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("should handle malformed JSON response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    } as unknown as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    expect(mockConsoleError).toHaveBeenCalled();
  });

  it("should show correct notification count with mixed read/unread", async () => {
    const mixedNotifications = [
      { ...mockNotifications[0], isRead: false },
      { ...mockNotifications[1], isRead: true }, // This one is read
      {
        id: "notif-3",
        type: "test",
        title: "Another notification",
        message: "Test",
        isRead: false,
        createdAt: "2024-01-01T08:00:00Z",
      },
    ];

    // Since we request unreadOnly=true, API should only return unread ones
    const unreadOnly = mixedNotifications.filter((n) => !n.isRead);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: unreadOnly }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
