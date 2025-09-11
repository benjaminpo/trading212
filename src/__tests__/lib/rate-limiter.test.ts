// Need to create a class that we can import for testing
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getTimeUntilReset(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
}

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter
  const windowMs = 1000 // 1 second
  const maxRequests = 3

  beforeEach(() => {
    rateLimiter = new RateLimiter(windowMs, maxRequests)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('canMakeRequest', () => {
    it('should allow requests within the limit', () => {
      const key = 'test-user-1'

      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
    })

    it('should reject requests exceeding the limit', () => {
      const key = 'test-user-1'

      // Use up the allowed requests
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)

      // This should be rejected
      expect(rateLimiter.canMakeRequest(key)).toBe(false)
      expect(rateLimiter.canMakeRequest(key)).toBe(false)
    })

    it('should reset after time window expires', () => {
      const key = 'test-user-1'

      // Use up the allowed requests
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(false)

      // Advance time beyond the window
      jest.advanceTimersByTime(windowMs + 1)

      // Should be allowed again
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
    })

    it('should handle multiple keys independently', () => {
      const key1 = 'user-1'
      const key2 = 'user-2'

      // User 1 uses up their limit
      expect(rateLimiter.canMakeRequest(key1)).toBe(true)
      expect(rateLimiter.canMakeRequest(key1)).toBe(true)
      expect(rateLimiter.canMakeRequest(key1)).toBe(true)
      expect(rateLimiter.canMakeRequest(key1)).toBe(false)

      // User 2 should still be allowed
      expect(rateLimiter.canMakeRequest(key2)).toBe(true)
      expect(rateLimiter.canMakeRequest(key2)).toBe(true)
      expect(rateLimiter.canMakeRequest(key2)).toBe(true)
      expect(rateLimiter.canMakeRequest(key2)).toBe(false)
    })

    it('should clean up old entries', () => {
      const key = 'test-user-1'

      // Make some requests
      rateLimiter.canMakeRequest(key)
      rateLimiter.canMakeRequest(key)

      // Advance time to expire the window
      jest.advanceTimersByTime(windowMs + 1)

      // Make a new request (this should clean up old entries)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)

      // Verify that the rate limiter has cleaned up by checking we have a fresh count
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(true)
      expect(rateLimiter.canMakeRequest(key)).toBe(false) // Should hit limit again
    })

    it('should handle edge case of zero max requests', () => {
      const zeroLimiter = new RateLimiter(windowMs, 0)
      const key = 'test-user'

      expect(zeroLimiter.canMakeRequest(key)).toBe(false)
      expect(zeroLimiter.canMakeRequest(key)).toBe(false)
    })

    it('should handle very short time windows', () => {
      const shortLimiter = new RateLimiter(10, 1) // 10ms window, 1 request
      const key = 'test-user'

      expect(shortLimiter.canMakeRequest(key)).toBe(true)
      expect(shortLimiter.canMakeRequest(key)).toBe(false)

      jest.advanceTimersByTime(11)
      expect(shortLimiter.canMakeRequest(key)).toBe(true)
    })
  })

  describe('getTimeUntilReset', () => {
    it('should return correct time until reset', () => {
      const key = 'test-user-1'

      // Make a request
      rateLimiter.canMakeRequest(key)
      
      const timeUntilReset = rateLimiter.getTimeUntilReset(key)
      expect(timeUntilReset).toBeGreaterThan(0)
      expect(timeUntilReset).toBeLessThanOrEqual(windowMs)
    })

    it('should return 0 for new key with no requests', () => {
      const key = 'new-user'
      expect(rateLimiter.getTimeUntilReset(key)).toBe(0)
    })

    it('should decrease over time', () => {
      const key = 'test-user-1'

      rateLimiter.canMakeRequest(key)
      const initialTime = rateLimiter.getTimeUntilReset(key)
      
      jest.advanceTimersByTime(100)
      const laterTime = rateLimiter.getTimeUntilReset(key)
      
      expect(laterTime).toBeLessThan(initialTime)
    })

    it('should return 0 after window expires', () => {
      const key = 'test-user-1'

      rateLimiter.canMakeRequest(key)
      expect(rateLimiter.getTimeUntilReset(key)).toBeGreaterThan(0)

      jest.advanceTimersByTime(windowMs + 1)
      expect(rateLimiter.getTimeUntilReset(key)).toBe(0)
    })
  })
})
