import { RateLimiter } from "@/lib/rate-limiter";

describe("RateLimiter - Edge Cases", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(1000, 10); // 1 second window, 10 requests
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("Basic Rate Limiting Edge Cases", () => {
    it("should handle zero rate limit", () => {
      const result = rateLimiter.canMakeRequest("test", 0);
      expect(result).toBe(false);
    });

    it("should handle negative rate limit", () => {
      const result = rateLimiter.canMakeRequest("test", -1);
      expect(result).toBe(false);
    });

    it("should handle very large rate limit", () => {
      const result = rateLimiter.canMakeRequest(
        "test",
        Number.MAX_SAFE_INTEGER,
      );
      expect(result).toBe(true);
    });

    it("should handle null identifier", () => {
      expect(() => {
        rateLimiter.canMakeRequest(null as any, 10);
      }).toThrow();
    });

    it("should handle undefined identifier", () => {
      expect(() => {
        rateLimiter.canMakeRequest(undefined as any, 10);
      }).toThrow();
    });

    it("should handle empty string identifier", () => {
      const result = rateLimiter.canMakeRequest("", 10);
      expect(result).toBe(true);
    });

    it("should handle whitespace-only identifier", () => {
      const result = rateLimiter.canMakeRequest("   ", 10);
      expect(result).toBe(true);
    });
  });

  describe("Time Window Edge Cases", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Create a new rate limiter that uses fake timers
      rateLimiter = new RateLimiter(1000, 10); // 1 second window, 10 requests
      // Override the getCurrentTime method to use fake timers
      (rateLimiter as any).getCurrentTime = () => Date.now();
    });

    it("should handle requests at exact time boundaries", () => {
      rateLimiter.canMakeRequest("test", 2);
      rateLimiter.canMakeRequest("test", 2);

      // Third request should be blocked
      expect(rateLimiter.canMakeRequest("test", 2)).toBe(false);

      // Fast forward to next second
      jest.advanceTimersByTime(1000);

      // Should be able to make another request
      expect(rateLimiter.canMakeRequest("test", 2)).toBe(true);
    });

    it("should handle rapid successive requests", () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(rateLimiter.canMakeRequest("test", 5));
      }

      // First 5 should be allowed, rest should be blocked
      expect(results.slice(0, 5)).toEqual([true, true, true, true, true]);
      expect(results.slice(5)).toEqual([false, false, false, false, false]);
    });

    it("should handle requests across multiple time windows", () => {
      // Fill up the first window
      for (let i = 0; i < 3; i++) {
        rateLimiter.canMakeRequest("test", 3);
      }

      // Should be blocked
      expect(rateLimiter.canMakeRequest("test", 3)).toBe(false);

      // Fast forward to next window
      jest.advanceTimersByTime(1000);

      // Should be allowed again
      expect(rateLimiter.canMakeRequest("test", 3)).toBe(true);
    });

    it("should handle very long time periods", () => {
      rateLimiter.canMakeRequest("test", 1);

      // Fast forward 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000);

      // Should still be able to make request (window should have reset)
      expect(rateLimiter.canMakeRequest("test", 1)).toBe(true);
    });
  });

  describe("Multiple Identifiers Edge Cases", () => {
    it("should handle multiple identifiers independently", () => {
      // Fill up rate limit for first identifier
      rateLimiter.canMakeRequest("user1", 2);
      rateLimiter.canMakeRequest("user1", 2);
      expect(rateLimiter.canMakeRequest("user1", 2)).toBe(false);

      // Second identifier should still be able to make requests
      expect(rateLimiter.canMakeRequest("user2", 2)).toBe(true);
      expect(rateLimiter.canMakeRequest("user2", 2)).toBe(true);
      expect(rateLimiter.canMakeRequest("user2", 2)).toBe(false);
    });

    it("should handle many different identifiers", () => {
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(rateLimiter.canMakeRequest(`user${i}`, 1));
      }

      // All should be allowed since they're different identifiers
      expect(results.every((result) => result === true)).toBe(true);
    });

    it("should handle identifier with special characters", () => {
      const specialId = "user@#$%^&*()_+{}|:\"<>?[]\\;',./";
      expect(rateLimiter.canMakeRequest(specialId, 10)).toBe(true);
    });

    it("should handle very long identifier", () => {
      const longId = "a".repeat(10000);
      expect(rateLimiter.canMakeRequest(longId, 10)).toBe(true);
    });
  });

  describe("Memory Management Edge Cases", () => {
    it("should handle memory cleanup for old entries", () => {
      // Make requests for multiple identifiers
      for (let i = 0; i < 100; i++) {
        rateLimiter.canMakeRequest(`user${i}`, 1);
      }

      // Fast forward to clean up old entries
      jest.useFakeTimers();
      // Override the getCurrentTime method to use fake timers
      (rateLimiter as any).getCurrentTime = () => Date.now();
      jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      // Make a new request to trigger cleanup
      rateLimiter.canMakeRequest("newuser", 1);

      // Should not throw any memory errors
      expect(rateLimiter.canMakeRequest("newuser", 1)).toBe(false);
    });

    it("should handle concurrent access to same identifier", () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(rateLimiter.canMakeRequest("concurrent", 10));
            }, Math.random() * 10);
          }),
        );
      }

      return Promise.all(promises).then((results) => {
        // Should have exactly 10 true values and 90 false values
        const trueCount = results.filter((result) => result === true).length;
        expect(trueCount).toBe(10);
      });
    });
  });

  describe("Edge Case Scenarios", () => {
    it("should handle rate limit changes for same identifier", () => {
      // Start with rate limit of 2
      rateLimiter.canMakeRequest("test", 2);
      rateLimiter.canMakeRequest("test", 2);
      expect(rateLimiter.canMakeRequest("test", 2)).toBe(false);

      // Change to higher rate limit
      expect(rateLimiter.canMakeRequest("test", 5)).toBe(true);
      expect(rateLimiter.canMakeRequest("test", 5)).toBe(true);
      expect(rateLimiter.canMakeRequest("test", 5)).toBe(true);
    });

    it("should handle rate limit changes to lower value", () => {
      // Start with rate limit of 5
      for (let i = 0; i < 5; i++) {
        rateLimiter.canMakeRequest("test", 5);
      }
      expect(rateLimiter.canMakeRequest("test", 5)).toBe(false);

      // Change to lower rate limit
      expect(rateLimiter.canMakeRequest("test", 2)).toBe(false);
    });

    it("should handle Infinity rate limit", () => {
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(rateLimiter.canMakeRequest("test", Infinity));
      }

      // All should be allowed
      expect(results.every((result) => result === true)).toBe(true);
    });

    it("should handle NaN rate limit", () => {
      const result = rateLimiter.canMakeRequest("test", NaN);
      expect(result).toBe(false);
    });

    it("should handle decimal rate limits", () => {
      const result = rateLimiter.canMakeRequest("test", 2.5);
      expect(result).toBe(true);

      // Should still work with decimal limits
      expect(rateLimiter.canMakeRequest("test", 2.5)).toBe(true);
    });
  });

  describe("Error Handling Edge Cases", () => {
    it("should handle invalid identifier types", () => {
      expect(() => {
        rateLimiter.canMakeRequest(123 as any, 10);
      }).toThrow();

      expect(() => {
        rateLimiter.canMakeRequest({} as any, 10);
      }).toThrow();

      expect(() => {
        rateLimiter.canMakeRequest([] as any, 10);
      }).toThrow();
    });

    it("should handle invalid rate limit types", () => {
      expect(() => {
        rateLimiter.canMakeRequest("test", "invalid" as any);
      }).toThrow();

      expect(() => {
        rateLimiter.canMakeRequest("test", {} as any);
      }).toThrow();

      expect(() => {
        rateLimiter.canMakeRequest("test", [] as any);
      }).toThrow();
    });

    it("should handle very large numbers", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      expect(rateLimiter.canMakeRequest("test", largeNumber)).toBe(true);
    });

    it("should handle very small numbers", () => {
      const smallNumber = Number.MIN_SAFE_INTEGER;
      expect(rateLimiter.canMakeRequest("test", smallNumber)).toBe(false);
    });
  });

  describe("Integration Edge Cases", () => {
    it("should handle mixed valid and invalid inputs", () => {
      const validResults = [];
      const invalidResults = [];

      // Valid inputs
      validResults.push(rateLimiter.canMakeRequest("user1", 10));
      validResults.push(rateLimiter.canMakeRequest("user2", 5));
      validResults.push(rateLimiter.canMakeRequest("user3", 1));

      // Invalid inputs (should throw)
      try {
        rateLimiter.canMakeRequest(null as any, 10);
      } catch {
        invalidResults.push("threw");
      }

      // Negative rate limit should return false, not throw
      const negativeResult = rateLimiter.canMakeRequest("user4", -1);
      if (negativeResult === false) {
        invalidResults.push("threw");
      }

      expect(validResults).toEqual([true, true, true]);
      expect(invalidResults).toEqual(["threw", "threw"]);
    });

    it("should handle stress test scenario", () => {
      const startTime = Date.now();

      // Make many requests with different identifiers
      for (let i = 0; i < 1000; i++) {
        rateLimiter.canMakeRequest(
          `stress${i}`,
          Math.floor(Math.random() * 10) + 1,
        );
      }

      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
