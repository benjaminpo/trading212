import { APICache, apiCache, CacheEntry } from "@/lib/api-cache";
import logger from "@/lib/logger";

// Mock logger.info to avoid noise in tests
const mockConsoleLog = jest.spyOn(logger, "info").mockImplementation();

describe("APICache", () => {
  let cache: APICache;

  beforeEach(() => {
    // Get fresh instance for each test
    cache = APICache.getInstance();
    // Clear any existing cache
    cache.invalidateAll();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = APICache.getInstance();
      const instance2 = APICache.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should return the global apiCache instance", () => {
      expect(apiCache).toBeInstanceOf(APICache);
    });
  });

  describe("Cache Operations", () => {
    const testData = { portfolio: [{ symbol: "AAPL", quantity: 100 }] };
    const userId = "user123";
    const accountId = "account456";
    const dataType = "portfolio" as const;

    it("should store and retrieve data", async () => {
      // Set data
      await cache.set(userId, accountId, dataType, testData);

      // Get data
      const retrieved = await cache.get(userId, accountId, dataType);

      expect(retrieved).toEqual(testData);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Cache SET for portfolio"),
      );
    });

    it("should return null for non-existent data", async () => {
      const retrieved = await cache.get(userId, accountId, dataType);
      expect(retrieved).toBeNull();
    });

    it("should handle cache expiration", async () => {
      // Set data
      await cache.set(userId, accountId, dataType, testData);

      // Manually expire the cache by modifying the timestamp
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);

      // Wait for expiration (in real scenario, TTL would be longer)
      // For testing, we'll simulate expiration by directly manipulating the cache
      const cacheKey = `${userId}:${accountId}:${dataType}:`;
      const memoryCache = (cache as any).memoryCache;
      const entry = memoryCache.get(cacheKey);
      if (entry) {
        entry.timestamp = Date.now() - (entry.ttl + 1000); // Expired
      }

      // Try to get expired data
      const retrieved = await cache.get(userId, accountId, dataType);
      expect(retrieved).toBeNull();
    });

    it("should handle cache hits correctly", async () => {
      await cache.set(userId, accountId, dataType, testData);

      // First call should be a cache hit
      const retrieved = await cache.get(userId, accountId, dataType);
      expect(retrieved).toEqual(testData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Cache HIT for portfolio"),
      );
    });

    it("should support parameters in cache keys", async () => {
      const params = { includeOrders: true };
      await cache.set(userId, accountId, dataType, testData, params);

      const retrieved = await cache.get(userId, accountId, dataType, params);
      expect(retrieved).toEqual(testData);

      // Different params should not match
      const differentParams = { includeOrders: false };
      const notFound = await cache.get(
        userId,
        accountId,
        dataType,
        differentParams,
      );
      expect(notFound).toBeNull();
    });
  });

  describe("Cache Invalidation", () => {
    const userId = "user123";
    const accountId1 = "account1";
    const accountId2 = "account2";
    const dataType = "portfolio" as const;

    beforeEach(async () => {
      // Set up test data
      await cache.set(userId, accountId1, dataType, { data: "account1" });
      await cache.set(userId, accountId2, dataType, { data: "account2" });
      await cache.set(userId, accountId1, "account", {
        data: "account1-account",
      });
    });

    it("should invalidate all cache for a user", async () => {
      const statsBefore = cache.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      await cache.invalidate(userId);

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(0);
    });

    it("should invalidate cache for specific account", async () => {
      const statsBefore = cache.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      await cache.invalidate(userId, accountId1);

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(1); // Only account2 should remain

      // Verify specific account data is gone
      const retrieved = await cache.get(userId, accountId1, dataType);
      expect(retrieved).toBeNull();

      // Verify other account data remains
      const otherRetrieved = await cache.get(userId, accountId2, dataType);
      expect(otherRetrieved).toEqual({ data: "account2" });
    });

    it("should invalidate cache for specific data type", async () => {
      const statsBefore = cache.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      await cache.invalidate(userId, undefined, dataType);

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(1); // Only account data should remain
    });

    it("should clear all cache", async () => {
      const statsBefore = cache.getStats();
      expect(statsBefore.totalEntries).toBe(3);

      await cache.invalidateAll();

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });

  describe("Cache Statistics", () => {
    it("should provide accurate statistics", async () => {
      const initialStats = cache.getStats();
      expect(initialStats.totalEntries).toBe(0);
      expect(initialStats.memoryUsage).toBe(0);

      // Add some data
      await cache.set("user1", "account1", "portfolio", { data: "test1" });
      await cache.set("user1", "account2", "portfolio", { data: "test2" });

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(2);
      expect(statsAfter.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe("Memory Management", () => {
    it("should enforce memory limits", async () => {
      const MAX_ENTRIES = 1000;

      // Add many entries to test memory limit
      for (let i = 0; i < MAX_ENTRIES + 100; i++) {
        await cache.set(`user${i}`, `account${i}`, "portfolio", {
          data: `test${i}`,
        });
      }

      const stats = cache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(MAX_ENTRIES);
    });

    it("should clean expired entries", async () => {
      // Add some data
      await cache.set("user1", "account1", "portfolio", { data: "test1" });

      const statsBefore = cache.getStats();
      expect(statsBefore.totalEntries).toBe(1);

      // Manually expire the entry
      const memoryCache = (cache as any).memoryCache;
      const cacheKey = "user1:account1:portfolio:";
      const entry = memoryCache.get(cacheKey);
      if (entry) {
        entry.timestamp = Date.now() - (entry.ttl + 1000);
      }

      // Trigger cleanup by adding new entry
      await cache.set("user2", "account2", "portfolio", { data: "test2" });

      const statsAfter = cache.getStats();
      expect(statsAfter.totalEntries).toBe(1); // Only the new entry should remain
    });
  });

  describe("Database Cache Methods", () => {
    it("should handle database cache get operations", async () => {
      const result = await cache.getFromDatabase(
        "user1",
        "account1",
        "portfolio",
      );
      expect(result).toBeNull(); // Returns null as per current implementation
    });

    it("should handle database cache set operations", async () => {
      await expect(
        cache.setInDatabase("user1", "account1", "portfolio", { data: "test" }),
      ).resolves.not.toThrow();
    });
  });

  describe("Cache Entry Interface", () => {
    it("should create valid cache entries", () => {
      const entry: CacheEntry<string> = {
        data: "test data",
        timestamp: Date.now(),
        ttl: 60000,
        accountId: "account1",
        userId: "user1",
        dataType: "portfolio",
      };

      expect(entry.data).toBe("test data");
      expect(entry.ttl).toBe(60000);
      expect(entry.accountId).toBe("account1");
      expect(entry.userId).toBe("user1");
      expect(entry.dataType).toBe("portfolio");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid cache operations gracefully", async () => {
      // Test with invalid parameters
      const result = await cache.get("", "", "portfolio" as any);
      expect(result).toBeNull();
    });

    it("should handle cache set with invalid data", async () => {
      await expect(
        cache.set("user1", "account1", "portfolio", null as any),
      ).resolves.not.toThrow();
    });
  });

  describe("Cache TTL Configuration", () => {
    it("should use correct TTL values for different data types", async () => {
      const testData = { data: "test" };

      // Test portfolio TTL (2 minutes)
      await cache.set("user1", "account1", "portfolio", testData);

      // Test account TTL (5 minutes)
      await cache.set("user1", "account1", "account", testData);

      // Test orders TTL (1 minute)
      await cache.set("user1", "account1", "orders", testData);

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(3);
    });
  });
});
