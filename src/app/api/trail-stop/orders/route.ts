import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/trail-stop/orders - List all trail stop orders for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.trailStopLossOrder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching trail stop orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// POST /api/trail-stop/orders - Create a new trail stop order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      symbol,
      quantity,
      trailAmount,
      trailPercent,
      isPractice = true,
      accountId,
    } = await request.json();

    // Validation
    if (!symbol || !quantity) {
      return NextResponse.json(
        { error: "Symbol and quantity are required" },
        { status: 400 },
      );
    }

    if (!trailAmount && !trailPercent) {
      return NextResponse.json(
        { error: "Either trail amount or trail percentage is required" },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    if (trailAmount && trailAmount <= 0) {
      return NextResponse.json(
        { error: "Trail amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (trailPercent && (trailPercent <= 0 || trailPercent >= 100)) {
      return NextResponse.json(
        { error: "Trail percentage must be between 0 and 100" },
        { status: 400 },
      );
    }

    // Create the trail stop order
    const order = await prisma.trailStopLossOrder.create({
      data: {
        userId: session.user.id,
        accountId: accountId || null,
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity),
        trailAmount: trailAmount ? parseFloat(trailAmount) : 0,
        trailPercent: trailPercent ? parseFloat(trailPercent) : null,
        isPractice,
        isActive: true,
      },
    });

    console.log(
      `✅ Trail stop order created: ${order.symbol} (${order.quantity} shares) - ${order.isPractice ? "Practice" : "Production"} mode`,
    );

    return NextResponse.json({
      order,
      message: "Trail stop order created successfully",
    });
  } catch (error) {
    console.error("Error creating trail stop order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
