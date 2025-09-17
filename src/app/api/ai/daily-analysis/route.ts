import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dailyScheduler } from "@/lib/scheduler";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Trigger analysis for the current user
    await dailyScheduler.analyzeUser(session.user.id);

    return NextResponse.json({
      message: "Daily analysis completed successfully",
    });
  } catch (error) {
    console.error("Manual daily analysis error:", error);
    return NextResponse.json(
      { error: "Failed to run daily analysis" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get analysis logs for the user
    const { prisma } = await import("@/lib/prisma");

    const logs = await prisma.aIAnalysisLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get analysis logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis logs" },
      { status: 500 },
    );
  }
}
