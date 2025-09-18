import { PrismaClient } from "@prisma/client";
import logger from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with better error handling and connection management
const createPrismaClient = () => {
  // Add connection pooling parameters to prevent prepared statement issues
  const databaseUrl = process.env.DATABASE_URL;
  const urlWithParams = databaseUrl?.includes("?")
    ? `${databaseUrl}&pgbouncer=true&connection_limit=1&pool_timeout=0`
    : `${databaseUrl}?pgbouncer=true&connection_limit=1&pool_timeout=0`;

  return new PrismaClient({
    log: ["error"], // Reduce logging to avoid noise
    datasources: {
      db: {
        url: urlWithParams,
      },
    },
    // Fix prepared statement issues with connection pooling
    transactionOptions: {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
    },
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Handle connection errors gracefully
// Note: $on('error') is not available in all Prisma versions

// Add connection health check with retry mechanism
export async function checkDatabaseConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        return false;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

// Helper function to retry database operations with client recreation
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorObj = error as { message?: string; code?: string };
      const isPreparedStatementError =
        errorObj.message?.includes("prepared statement") ||
        errorObj.message?.includes("connection") ||
        errorObj.message?.includes("timeout") ||
        errorObj.code === "26000" ||
        errorObj.code === "42P05" ||
        errorObj.code === "08P01" ||
        errorObj.code === "ECONNREFUSED" ||
        errorObj.code === "ETIMEDOUT";

      if (isPreparedStatementError && i < retries - 1) {
        logger.info(
          `Retrying database operation (attempt ${i + 2}/${retries}) - ${errorObj.message}`,
        );

        // Recreate Prisma client to clear prepared statement cache
        if (globalForPrisma.prisma) {
          await globalForPrisma.prisma.$disconnect();
          globalForPrisma.prisma = undefined;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

// Graceful shutdown
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
