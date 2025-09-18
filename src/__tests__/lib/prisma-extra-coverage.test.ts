import { retryDatabaseOperation, checkDatabaseConnection } from "@/lib/prisma";

// Mock logger to avoid noisy output
import logger from "@/lib/logger";

const originalLoggerError = logger.error;
const originalLoggerInfo = logger.info;
beforeAll(() => {
  logger.error = jest.fn();
  logger.info = jest.fn();
});
afterAll(() => {
  logger.error = originalLoggerError;
  logger.info = originalLoggerInfo;
});

describe("prisma extra coverage", () => {
  it("retryDatabaseOperation should throw immediately on non-retryable error", async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("validation failed"), { code: "P2002" }),
      );
    await expect(retryDatabaseOperation(op, 1)).rejects.toThrow(
      "validation failed",
    );
  });

  it("checkDatabaseConnection returns false when retries is 0", async () => {
    const result = await checkDatabaseConnection(0);
    expect(result).toBe(false);
  });
});
