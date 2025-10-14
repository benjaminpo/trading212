import { Pool, PoolClient, QueryResult } from "pg";
import logger from "@/lib/logger";

// Database connection pool
let pool: Pool | null = null;

// Initialize database connection pool
function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
}

// Get database pool instance
export function getPool(): Pool {
  if (!pool) {
    pool = createPool();

    // Handle pool errors
    pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", err);
    });

    // Handle pool connection events
    pool.on("connect", () => {
      logger.info("Database pool connected");
    });
  }

  return pool;
}

// Execute a query with automatic connection management
export async function query<
  T extends Record<string, unknown> = Record<string, unknown>,
>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(
        `Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`,
      );
    }

    return result;
  } catch (error) {
    logger.error("Database query error:", {
      error: error instanceof Error ? error.message : String(error),
      query: text.substring(0, 100),
      params: params?.length ? `${params.length} parameters` : "no parameters",
    });
    throw error;
  }
}

// Execute a transaction
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Retry database operations with exponential backoff
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a retryable error
      const isRetryable =
        lastError.message.includes("connection") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("ETIMEDOUT") ||
        lastError.message.includes("pool");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.info(
        `Database operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT 1 as health_check");
    return result.rows.length > 0;
  } catch (error) {
    logger.error("Database health check failed:", error);
    return false;
  }
}

// Generate CUID-like ID (simplified version)
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}

// Close database connections (for graceful shutdown)
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed");
  }
}

// Database helper functions for common operations
export const db = {
  // User operations
  async findUserById(id: string) {
    const result = await query('SELECT * FROM "User" WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findUserByEmail(email: string) {
    const result = await query('SELECT * FROM "User" WHERE email = $1', [
      email,
    ]);
    return result.rows[0] || null;
  },

  async createUser(userData: {
    id?: string;
    name?: string;
    email: string;
    password?: string;
    emailVerified?: Date;
    image?: string;
  }) {
    const id = userData.id || generateId();
    const now = new Date();

    const result = await query(
      `INSERT INTO "User" (id, name, email, password, "emailVerified", image, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        userData.name || null,
        userData.email,
        userData.password || null,
        userData.emailVerified || null,
        userData.image || null,
        now,
        now,
      ],
    );
    return result.rows[0];
  },

  // Trading212Account operations
  async findTradingAccountsByUserId(
    userId: string,
    activeOnly: boolean = true,
  ) {
    const whereClause = activeOnly
      ? 'WHERE "userId" = $1 AND "isActive" = true'
      : 'WHERE "userId" = $1';

    const result = await query(
      `SELECT * FROM "Trading212Account" ${whereClause} ORDER BY "isDefault" DESC, "createdAt" ASC`,
      [userId],
    );
    return result.rows;
  },

  async findTradingAccountById(id: string) {
    const result = await query(
      'SELECT * FROM "Trading212Account" WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  },

  async createTradingAccount(accountData: {
    userId: string;
    name: string;
    apiKey: string;
    isPractice?: boolean;
    isActive?: boolean;
    isDefault?: boolean;
  }) {
    const id = generateId();
    const now = new Date();

    const result = await query(
      `INSERT INTO "Trading212Account" (id, "userId", name, "apiKey", "isPractice", "isActive", "isDefault", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        accountData.userId,
        accountData.name,
        accountData.apiKey,
        accountData.isPractice || false,
        accountData.isActive !== false,
        accountData.isDefault || false,
        now,
        now,
      ],
    );
    return result.rows[0];
  },

  // Session operations
  async findSessionByToken(sessionToken: string) {
    const result = await query(
      'SELECT * FROM "Session" WHERE "sessionToken" = $1',
      [sessionToken],
    );
    return result.rows[0] || null;
  },

  async createSession(sessionData: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }) {
    const id = generateId();

    const result = await query(
      `INSERT INTO "Session" (id, "sessionToken", "userId", expires)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, sessionData.sessionToken, sessionData.userId, sessionData.expires],
    );
    return result.rows[0];
  },

  async deleteSession(sessionToken: string) {
    await query('DELETE FROM "Session" WHERE "sessionToken" = $1', [
      sessionToken,
    ]);
  },

  // Account operations (OAuth)
  async findAccountByProvider(provider: string, providerAccountId: string) {
    const result = await query(
      'SELECT * FROM "Account" WHERE provider = $1 AND "providerAccountId" = $2',
      [provider, providerAccountId],
    );
    return result.rows[0] || null;
  },

  async createAccount(accountData: {
    userId: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string;
    access_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
  }) {
    const id = generateId();

    const result = await query(
      `INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        accountData.userId,
        accountData.type,
        accountData.provider,
        accountData.providerAccountId,
        accountData.refresh_token || null,
        accountData.access_token || null,
        accountData.expires_at || null,
        accountData.token_type || null,
        accountData.scope || null,
        accountData.id_token || null,
        accountData.session_state || null,
      ],
    );
    return result.rows[0];
  },

  // Notification operations
  async findNotificationsByUserId(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 10,
  ) {
    const whereClause = unreadOnly
      ? 'WHERE "userId" = $1 AND "isRead" = false'
      : 'WHERE "userId" = $1';

    const result = await query(
      `SELECT * FROM "Notification" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${unreadOnly ? 2 : 2}`,
      unreadOnly ? [userId, limit] : [userId, limit],
    );
    return result.rows;
  },

  async createNotification(notificationData: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: string;
  }) {
    const id = generateId();
    const now = new Date();

    const result = await query(
      `INSERT INTO "Notification" (id, "userId", type, title, message, data, "isRead", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.data || null,
        false,
        now,
        now,
      ],
    );
    return result.rows[0];
  },

  // DailyPnL operations
  async findDailyPnLByUser(userId: string, days: number = 30) {
    const result = await query(
      `SELECT * FROM "DailyPnL" 
       WHERE "userId" = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`,
      [userId],
    );
    return result.rows;
  },

  async upsertDailyPnL(pnlData: {
    userId: string;
    accountId?: string;
    date: Date;
    totalPnL: number;
    todayPnL: number;
    totalValue: number;
    cash?: number;
    currency?: string;
    positions?: number;
  }) {
    const id = generateId();
    const now = new Date();

    const result = await query(
      `INSERT INTO "DailyPnL" (id, "userId", "accountId", date, "totalPnL", "todayPnL", "totalValue", cash, currency, positions, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT ("userId", "accountId", date) 
       DO UPDATE SET 
         "totalPnL" = EXCLUDED."totalPnL",
         "todayPnL" = EXCLUDED."todayPnL", 
         "totalValue" = EXCLUDED."totalValue",
         cash = EXCLUDED.cash,
         currency = EXCLUDED.currency,
         positions = EXCLUDED.positions,
         "updatedAt" = EXCLUDED."updatedAt"
       RETURNING *`,
      [
        id,
        pnlData.userId,
        pnlData.accountId || null,
        pnlData.date,
        pnlData.totalPnL,
        pnlData.todayPnL,
        pnlData.totalValue,
        pnlData.cash || null,
        pnlData.currency || "USD",
        pnlData.positions || 0,
        now,
        now,
      ],
    );
    return result.rows[0];
  },

  // AI Recommendation operations
  async countAIRecommendationsByUser(
    userId: string,
    activeOnly: boolean = true,
  ) {
    const whereClause = activeOnly
      ? 'WHERE "userId" = $1 AND "isActive" = true'
      : 'WHERE "userId" = $1';

    const result = await query(
      `SELECT COUNT(*) as count FROM "AIRecommendation" ${whereClause}`,
      [userId],
    );
    return parseInt(result.rows[0].count as string);
  },
};

// Export the main functions
export {
  query as dbQuery,
  transaction as dbTransaction,
  retryDatabaseOperation as dbRetry,
  checkDatabaseConnection as dbHealthCheck,
  closeDatabase as dbClose,
};
