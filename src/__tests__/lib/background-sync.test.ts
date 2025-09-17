import {
  BackgroundSyncService,
  backgroundSyncService,
} from "../../lib/background-sync";

// Mock dependencies
jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    aIRecommendation: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("../../lib/optimized-trading212", () => ({
  optimizedTrading212Service: {
    backgroundSync: jest.fn(),
    getCacheStats: jest.fn(),
    getBatchStats: jest.fn(),
  },
}));

describe("BackgroundSyncService", () => {
  let syncService: BackgroundSyncService;

  beforeEach(() => {
    syncService = BackgroundSyncService.getInstance();
    jest.clearAllMocks();

    // Clear any existing intervals
    if ((syncService as any).syncInterval) {
      clearInterval((syncService as any).syncInterval);
      (syncService as any).syncInterval = null;
    }
    (syncService as any).isRunning = false;
  });

  afterEach(() => {
    // Clean up intervals
    if ((syncService as any).syncInterval) {
      clearInterval((syncService as any).syncInterval);
      (syncService as any).syncInterval = null;
    }
    (syncService as any).isRunning = false;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = BackgroundSyncService.getInstance();
      const instance2 = BackgroundSyncService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should return the global instance", () => {
      expect(backgroundSyncService).toBeInstanceOf(BackgroundSyncService);
    });
  });

  describe("start()", () => {
    it("should start the service successfully", async () => {
      const { prisma } = require("../../lib/prisma");
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");

      prisma.user.findMany.mockResolvedValue([]);
      optimizedTrading212Service.backgroundSync.mockResolvedValue(undefined);

      await syncService.start();

      expect(syncService.isServiceRunning()).toBe(true);
      expect((syncService as any).isRunning).toBe(true);
    });

    it("should not start if already running", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const { prisma } = require("../../lib/prisma");

      prisma.user.findMany.mockResolvedValue([]);

      // Start first time
      await syncService.start();
      expect(syncService.isServiceRunning()).toBe(true);

      // Try to start again
      await syncService.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔄 Background sync is already running",
      );
      consoleSpy.mockRestore();
    });

    it("should handle errors during start", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.user.findMany.mockRejectedValue(new Error("Database error"));

      await expect(syncService.start()).resolves.not.toThrow();
      expect(syncService.isServiceRunning()).toBe(true);
    });
  });

  describe("stop()", () => {
    it("should stop the service successfully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const { prisma } = require("../../lib/prisma");

      prisma.user.findMany.mockResolvedValue([]);

      await syncService.start();
      expect(syncService.isServiceRunning()).toBe(true);

      await syncService.stop();
      expect(syncService.isServiceRunning()).toBe(false);
      expect((syncService as any).syncInterval).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "⏹️ Background sync service stopped",
      );

      consoleSpy.mockRestore();
    });

    it("should handle stop when not running", async () => {
      await syncService.stop();
      expect(syncService.isServiceRunning()).toBe(false);
    });
  });

  describe("runSync()", () => {
    it("should sync users successfully", async () => {
      const { prisma } = require("../../lib/prisma");
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");

      const mockUsers = [
        {
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
            },
            { id: "acc2", apiKey: "key2", isPractice: true, name: "Account 2" },
          ],
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);
      optimizedTrading212Service.backgroundSync.mockResolvedValue(undefined);

      const stats = await (syncService as any).runSync();

      expect(stats.usersProcessed).toBe(1);
      expect(stats.accountsProcessed).toBe(2);
      expect(stats.errors).toBe(0);
      expect(stats.executionTime).toBeGreaterThan(0);
      expect(optimizedTrading212Service.backgroundSync).toHaveBeenCalledWith(
        "user1",
        [
          { id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" },
          { id: "acc2", apiKey: "key2", isPractice: true, name: "Account 2" },
        ],
      );
    });

    it("should handle empty users list", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.user.findMany.mockResolvedValue([]);

      const stats = await (syncService as any).runSync();

      expect(stats.usersProcessed).toBe(0);
      expect(stats.accountsProcessed).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it("should handle user sync errors", async () => {
      const { prisma } = require("../../lib/prisma");
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const mockUsers = [
        {
          id: "user1",
          trading212Accounts: [
            {
              id: "acc1",
              apiKey: "key1",
              isPractice: false,
              name: "Account 1",
            },
          ],
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);
      optimizedTrading212Service.backgroundSync.mockRejectedValue(
        new Error("Sync error"),
      );

      const stats = await (syncService as any).runSync();

      expect(stats.usersProcessed).toBe(0);
      expect(stats.accountsProcessed).toBe(0);
      expect(stats.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Background sync failed for user user1:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle database errors", async () => {
      const { prisma } = require("../../lib/prisma");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      prisma.user.findMany.mockRejectedValue(new Error("Database error"));

      const stats = await (syncService as any).runSync();

      expect(stats.usersProcessed).toBe(0);
      expect(stats.accountsProcessed).toBe(0);
      expect(stats.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Background sync error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("syncUser()", () => {
    it("should sync user successfully", async () => {
      const { prisma } = require("../../lib/prisma");
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");

      const mockUser = {
        id: "user1",
        trading212Accounts: [
          { id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" },
        ],
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      optimizedTrading212Service.backgroundSync.mockResolvedValue(undefined);

      const result = await syncService.syncUser("user1");

      expect(result.success).toBe(true);
      expect(result.accountsProcessed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("should handle user not found", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await syncService.syncUser("nonexistent");

      expect(result.success).toBe(false);
      expect(result.accountsProcessed).toBe(0);
      expect(result.errors).toBe(0);
    });

    it("should handle user with no accounts", async () => {
      const { prisma } = require("../../lib/prisma");
      prisma.user.findUnique.mockResolvedValue({
        id: "user1",
        trading212Accounts: [],
      });

      const result = await syncService.syncUser("user1");

      expect(result.success).toBe(false);
      expect(result.accountsProcessed).toBe(0);
      expect(result.errors).toBe(0);
    });

    it("should handle sync errors", async () => {
      const { prisma } = require("../../lib/prisma");
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const mockUser = {
        id: "user1",
        trading212Accounts: [
          { id: "acc1", apiKey: "key1", isPractice: false, name: "Account 1" },
        ],
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      optimizedTrading212Service.backgroundSync.mockRejectedValue(
        new Error("Sync error"),
      );

      const result = await syncService.syncUser("user1");

      expect(result.success).toBe(false);
      expect(result.accountsProcessed).toBe(0);
      expect(result.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ User sync failed for user1:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("clearOldCache()", () => {
    it("should clear old cache successfully", async () => {
      const { prisma } = require("../../lib/prisma");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      prisma.aIRecommendation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await syncService.clearOldCache();

      expect(result).toBe(5);
      expect(consoleSpy).toHaveBeenCalledWith(
        "🗑️ Cleared 5 old AI recommendations",
      );

      consoleSpy.mockRestore();
    });

    it("should handle cache cleanup errors", async () => {
      const { prisma } = require("../../lib/prisma");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      prisma.aIRecommendation.deleteMany.mockRejectedValue(
        new Error("Delete error"),
      );

      const result = await syncService.clearOldCache();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Cache cleanup error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("healthCheck()", () => {
    it("should return health status when running", async () => {
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");

      optimizedTrading212Service.getCacheStats.mockReturnValue({
        cache: "stats",
      });
      optimizedTrading212Service.getBatchStats.mockReturnValue({
        batch: "stats",
      });
      (syncService as any).isRunning = true;

      const health = await syncService.healthCheck();

      expect(health.isRunning).toBe(true);
      expect(health.lastSync).toBeDefined();
      expect(health.nextSync).toBeDefined();
      expect(health.stats.cache).toEqual({ cache: "stats" });
      expect(health.stats.batches).toEqual({ batch: "stats" });
    });

    it("should return health status when not running", async () => {
      const {
        optimizedTrading212Service,
      } = require("../../lib/optimized-trading212");

      optimizedTrading212Service.getCacheStats.mockReturnValue({
        cache: "stats",
      });
      optimizedTrading212Service.getBatchStats.mockReturnValue({
        batch: "stats",
      });
      (syncService as any).isRunning = false;

      const health = await syncService.healthCheck();

      expect(health.isRunning).toBe(false);
      expect(health.lastSync).toBeDefined();
      expect(health.nextSync).toBeDefined();
    });
  });

  describe("isServiceRunning()", () => {
    it("should return true when running", () => {
      (syncService as any).isRunning = true;
      expect(syncService.isServiceRunning()).toBe(true);
    });

    it("should return false when not running", () => {
      (syncService as any).isRunning = false;
      expect(syncService.isServiceRunning()).toBe(false);
    });
  });

  describe("Constants and Configuration", () => {
    it("should have correct sync interval", () => {
      expect((syncService as any).SYNC_INTERVAL).toBe(5 * 60 * 1000); // 5 minutes
    });

    it("should have correct max users per sync", () => {
      expect((syncService as any).MAX_USERS_PER_SYNC).toBe(10);
    });

    it("should have correct max accounts per user", () => {
      expect((syncService as any).MAX_ACCOUNTS_PER_USER).toBe(5);
    });
  });
});
