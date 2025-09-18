import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

// GET /api/trail-stop/orders/[orderId] - Get specific order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.trailStopLossOrder.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching trail stop order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

// PUT /api/trail-stop/orders/[orderId] - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quantity, trailAmount, trailPercent, stopPrice, isActive } =
      await request.json();

    const order = await prisma.trailStopLossOrder.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validation
    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    if (trailAmount !== undefined && trailAmount <= 0) {
      return NextResponse.json(
        { error: "Trail amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (
      trailPercent !== undefined &&
      (trailPercent <= 0 || trailPercent >= 100)
    ) {
      return NextResponse.json(
        { error: "Trail percentage must be between 0 and 100" },
        { status: 400 },
      );
    }

    // Update the order
    const updatedOrder = await prisma.trailStopLossOrder.update({
      where: { id: orderId },
      data: {
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(trailAmount !== undefined && {
          trailAmount: parseFloat(trailAmount),
        }),
        ...(trailPercent !== undefined && {
          trailPercent: trailPercent ? parseFloat(trailPercent) : null,
        }),
        ...(stopPrice !== undefined && {
          stopPrice: stopPrice ? parseFloat(stopPrice) : null,
        }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });

    logger.info(
      `✅ Trail stop order updated: ${updatedOrder.symbol} - Active: ${updatedOrder.isActive}`,
    );

    return NextResponse.json({
      order: updatedOrder,
      message: "Trail stop order updated successfully",
    });
  } catch (error) {
    console.error("Error updating trail stop order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}

// DELETE /api/trail-stop/orders/[orderId] - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.trailStopLossOrder.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.trailStopLossOrder.delete({
      where: { id: orderId },
    });

    logger.info(`✅ Trail stop order deleted: ${order.symbol}`);

    return NextResponse.json({
      message: "Trail stop order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting trail stop order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}
