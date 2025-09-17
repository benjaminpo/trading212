import { retryDatabaseOperation, checkDatabaseConnection } from "@/lib/prisma";

// Mock console to avoid noisy output
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
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
