import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          trading212Accounts: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              isPractice: true,
              isDefault: true,
            },
          },
        },
      }),
    );

    const activeAccounts = user?.trading212Accounts || [];

    return NextResponse.json({
      hasApiKey: activeAccounts.length > 0,
      accounts: activeAccounts,
    });
  } catch (error) {
    console.error("Error fetching connection status:", error);
    return NextResponse.json(
      { error: "Failed to fetch connection status" },
      { status: 500 },
    );
  }
}
