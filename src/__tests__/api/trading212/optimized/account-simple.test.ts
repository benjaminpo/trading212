import { GET } from "../../../../app/api/trading212/optimized/account/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Database mocks are handled globally in jest.setup.js

jest.mock("@/lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    getAccount: jest.fn(),
  },
}));

describe("Optimized Trading212 Account Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle unauthorized requests", async () => {
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/trading212/optimized/account",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle missing user ID", async () => {
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue({ user: {} });

    const request = new NextRequest(
      "http://localhost:3000/api/trading212/optimized/account",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle users with no Trading212 accounts", async () => {
    const { getServerSession } = require("next-auth");

    getServerSession.mockResolvedValue({ user: { id: "user1" } });
    global.mockDb.findUserById.mockResolvedValue({ id: "user1" });
    global.mockDb.findTradingAccountsByUserId.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/trading212/optimized/account",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No Trading212 accounts configured");
  });

  it("should handle database errors", async () => {
    const { getServerSession } = require("next-auth");

    getServerSession.mockResolvedValue({ user: { id: "user1" } });
    global.mockDb.findUserById.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/trading212/optimized/account",
    );

    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("should handle API service errors", async () => {
    const { getServerSession } = require("next-auth");
    const {
      optimizedTrading212Service,
    } = require("@/lib/optimized-trading212");

    getServerSession.mockResolvedValue({ user: { id: "user1" } });
    global.mockDb.findUserById.mockResolvedValue({ id: "user1" });
    global.mockDb.findTradingAccountsByUserId.mockResolvedValue([
      { id: "acc1", apiKey: "key1", isDefault: true },
    ]);
    optimizedTrading212Service.getAccount.mockRejectedValue(
      new Error("API error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/trading212/optimized/account",
    );

    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
