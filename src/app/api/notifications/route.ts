import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const notifications = await retryDatabaseOperation(() =>
      prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly && { isRead: false }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, title, message, data } = await request.json();

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Type, title, and message are required" },
        { status: 400 },
      );
    }

    const notification = await retryDatabaseOperation(() =>
      prisma.notification.create({
        data: {
          userId: session.user.id,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
        },
      }),
    );

    console.log(
      `📧 Notification created: ${notification.type} for user ${session.user.id}`,
    );

    return NextResponse.json({
      notification,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}

// Helper function to create trail stop notifications
export async function createTrailStopNotification(
  userId: string,
  orderData: {
    symbol: string;
    quantity: number;
    stopPrice: number;
    trailAmount?: number;
    trailPercent?: number;
    isPractice: boolean;
  },
) {
  try {
    // Compute trail description if needed in the future

    const notification = await retryDatabaseOperation(() =>
      prisma.notification.create({
        data: {
          userId,
          type: "trail_stop_triggered",
          title: `🚨 Trail Stop Triggered - ${orderData.symbol}`,
          message: orderData.isPractice
            ? `Your trail stop order for ${orderData.quantity} shares of ${orderData.symbol} has been executed at $${orderData.stopPrice.toFixed(2)}.`
            : `Your trail stop order for ${orderData.quantity} shares of ${orderData.symbol} has been triggered at $${orderData.stopPrice.toFixed(2)}. Please manually execute the sell order in Trading212.`,
          data: JSON.stringify({
            symbol: orderData.symbol,
            quantity: orderData.quantity,
            stopPrice: orderData.stopPrice,
            trailAmount: orderData.trailAmount,
            trailPercent: orderData.trailPercent,
            isPractice: orderData.isPractice,
            action: orderData.isPractice ? "executed" : "notification_only",
          }),
        },
      }),
    );

    console.log(
      `📧 Trail stop notification created for ${orderData.symbol} - ${orderData.isPractice ? "Executed" : "Manual action required"}`,
    );

    return notification;
  } catch (error) {
    console.error("Error creating trail stop notification:", error);
    throw error;
  }
}
