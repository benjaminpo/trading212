import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Trading212API } from "@/lib/trading212";
import { createTrailStopNotification } from "@/app/api/notifications/route";
import logger from "@/lib/logger";

// POST /api/trail-stop/monitor - Monitor and process trail stop orders
export async function POST() {
  try {
    // Get all active trail stop orders
    const activeOrders = await prisma.trailStopLossOrder.findMany({
      where: { isActive: true },
      include: { user: { include: { trading212Accounts: true } } },
    });

    logger.info(
      `🔍 Monitoring ${activeOrders.length} active trail stop orders`,
    );

    let processedCount = 0;
    let triggeredCount = 0;

    for (const order of activeOrders) {
      try {
        // Find the associated Trading212 account
        let trading212Account = null;
        if (order.accountId) {
          trading212Account = order.user.trading212Accounts.find(
            (acc) => acc.id === order.accountId,
          );
        } else {
          // Fallback to default or first active account
          trading212Account =
            order.user.trading212Accounts.find((acc) => acc.isDefault) ||
            order.user.trading212Accounts.find((acc) => acc.isActive) ||
            order.user.trading212Accounts[0];
        }

        if (!trading212Account?.apiKey) {
          logger.info(`⚠️ No Trading212 account found for order ${order.id}`);
          continue;
        }

        // Create Trading212 API instance
        const trading212 = new Trading212API(
          trading212Account.apiKey,
          trading212Account.isPractice,
        );

        // Get current positions to find the symbol
        const positionsResponse = await trading212.getPositions();
        const positions = Array.isArray(positionsResponse)
          ? positionsResponse
          : [];
        const position = positions.find((p) => p.ticker === order.symbol);

        if (!position) {
          logger.info(
            `⚠️ Position ${order.symbol} not found for order ${order.id}`,
          );
          continue;
        }

        const currentPrice = position.currentPrice;
        processedCount++;

        // Calculate trail stop logic
        let shouldTrigger = false;
        let newStopPrice = order.stopPrice;

        if (order.trailPercent) {
          // Percentage-based trailing
          const trailDistance = currentPrice * (order.trailPercent / 100);
          const potentialStopPrice = currentPrice - trailDistance;

          // Update stop price if market moved favorably
          if (!order.stopPrice || potentialStopPrice > order.stopPrice) {
            newStopPrice = potentialStopPrice;
          }

          // Check if current price hit the stop price
          shouldTrigger = currentPrice <= (order.stopPrice || 0);
        } else {
          // Fixed amount trailing
          const potentialStopPrice = currentPrice - order.trailAmount;

          // Update stop price if market moved favorably
          if (!order.stopPrice || potentialStopPrice > order.stopPrice) {
            newStopPrice = potentialStopPrice;
          }

          // Check if current price hit the stop price
          shouldTrigger = currentPrice <= (order.stopPrice || 0);
        }

        // Update stop price if it changed
        if (newStopPrice !== order.stopPrice) {
          await prisma.trailStopLossOrder.update({
            where: { id: order.id },
            data: { stopPrice: newStopPrice },
          });
          logger.info(
            `📈 Updated stop price for ${order.symbol}: $${newStopPrice?.toFixed(2)}`,
          );
        }

        // Handle triggered orders
        if (shouldTrigger && order.stopPrice) {
          triggeredCount++;
          logger.info(
            `🚨 Trail stop triggered for ${order.symbol} at $${currentPrice.toFixed(2)}`,
          );

          if (order.isPractice) {
            // For practice accounts, we could simulate order execution
            logger.info(
              `🎯 [PRACTICE] Simulating sell order for ${order.quantity} shares of ${order.symbol}`,
            );

            // Create notification for practice execution
            await createTrailStopNotification(order.userId, {
              symbol: order.symbol,
              quantity: order.quantity,
              stopPrice: order.stopPrice,
              trailAmount: order.trailAmount,
              trailPercent: order.trailPercent || undefined,
              isPractice: true,
            });
          } else {
            // For production accounts, create notification for manual action
            logger.info(
              `📧 [PRODUCTION] Creating notification for manual execution of ${order.symbol}`,
            );

            await createTrailStopNotification(order.userId, {
              symbol: order.symbol,
              quantity: order.quantity,
              stopPrice: order.stopPrice,
              trailAmount: order.trailAmount,
              trailPercent: order.trailPercent || undefined,
              isPractice: false,
            });
          }

          // Deactivate the order
          await prisma.trailStopLossOrder.update({
            where: { id: order.id },
            data: { isActive: false },
          });
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      triggered: triggeredCount,
      message: `Monitored ${processedCount} orders, ${triggeredCount} triggered`,
    });
  } catch (error) {
    console.error("Error in trail stop monitoring:", error);
    return NextResponse.json(
      { error: "Failed to monitor trail stop orders" },
      { status: 500 },
    );
  }
}
