import {
  PUT,
  DELETE,
} from "../../../../../../app/api/trading212/optimized/accounts/[accountId]/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    trading212Account: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}));

describe("Trading212 Account [accountId] Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT /api/trading212/optimized/accounts/[accountId]", () => {
    it("should handle unauthorized requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Test Account", apiKey: "test-key" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle missing name", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue({ user: { id: "user1" } });

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ apiKey: "test-key" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and API key are required");
    });

    it("should handle missing apiKey", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue({ user: { id: "user1" } });

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Test Account" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and API key are required");
    });

    it("should handle account not found", async () => {
      const { getServerSession } = require("next-auth");
      const {
        prisma: _prisma,
        retryDatabaseOperation,
      } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });
      retryDatabaseOperation.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Test Account", apiKey: "test-key" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found");
    });

    it("should handle duplicate account name", async () => {
      const { getServerSession } = require("next-auth");
      const {
        prisma: _prisma,
        retryDatabaseOperation,
      } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });

      const mockExistingAccount = {
        id: "acc1",
        name: "Test Account",
        userId: "user1",
      };
      const mockDuplicateAccount = {
        id: "acc2",
        name: "Test Account",
        userId: "user1",
      };

      retryDatabaseOperation
        .mockResolvedValueOnce(mockExistingAccount) // First call for existing account
        .mockResolvedValueOnce(mockDuplicateAccount); // Second call for duplicate check

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Test Account", apiKey: "test-key" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("An account with this name already exists");
    });

    it("should update account successfully", async () => {
      const { getServerSession } = require("next-auth");
      const {
        prisma: _prisma,
        retryDatabaseOperation,
      } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });

      const mockExistingAccount = {
        id: "acc1",
        name: "Old Name",
        userId: "user1",
      };
      const mockUpdatedAccount = {
        id: "acc1",
        name: "New Name",
        isPractice: false,
      };

      retryDatabaseOperation
        .mockResolvedValueOnce(mockExistingAccount) // First call for existing account
        .mockResolvedValueOnce(null) // Second call for duplicate check (no duplicate)
        .mockResolvedValueOnce(mockUpdatedAccount); // Third call for update

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({
            name: "New Name",
            apiKey: "new-key",
            isPractice: false,
          }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.account).toEqual(mockUpdatedAccount);
    });

    it("should handle database errors", async () => {
      const { getServerSession } = require("next-auth");
      const { retryDatabaseOperation } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });
      retryDatabaseOperation.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Test Account", apiKey: "test-key" }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update account");
    });
  });

  describe("DELETE /api/trading212/optimized/accounts/[accountId]", () => {
    it("should handle unauthorized requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle account not found", async () => {
      const { getServerSession } = require("next-auth");
      const { retryDatabaseOperation } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });
      retryDatabaseOperation.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found");
    });

    it("should delete account successfully", async () => {
      const { getServerSession } = require("next-auth");
      const {
        prisma: _prisma,
        retryDatabaseOperation,
      } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });

      const mockAccount = { id: "acc1", name: "Test Account", userId: "user1" };
      retryDatabaseOperation
        .mockResolvedValueOnce(mockAccount) // First call for finding account
        .mockResolvedValueOnce(mockAccount); // Second call for deletion

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Account deleted successfully");
    });

    it("should handle database errors during deletion", async () => {
      const { getServerSession } = require("next-auth");
      const { retryDatabaseOperation } = require("@/lib/prisma");

      getServerSession.mockResolvedValue({ user: { id: "user1" } });
      retryDatabaseOperation
        .mockResolvedValueOnce({
          id: "acc1",
          name: "Test Account",
          userId: "user1",
        }) // Find account
        .mockRejectedValueOnce(new Error("Database error")); // Delete fails

      const request = new NextRequest(
        "http://localhost:3000/api/trading212/optimized/accounts/acc1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ accountId: "acc1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete account");
    });
  });
});
