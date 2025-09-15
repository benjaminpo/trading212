import { RateLimiter } from '@/lib/rate-limiter'

describe('RateLimiter Coverage Tests', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter(1000, 5) // 5 requests per 1000ms
  })

  describe('canMakeRequest', () => {
    it('should allow requests within limit', () => {
      expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      expect(rateLimiter.canMakeRequest('user1')).toBe(true)
    })

    it('should block requests when limit exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      }
      
      // 6th request should be blocked
      expect(rateLimiter.canMakeRequest('user1')).toBe(false)
    })

    it('should track different users separately', () => {
      // User1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.canMakeRequest('user1')).toBe(true)
      }
      
      // User2 should still be able to make requests
      expect(rateLimiter.canMakeRequest('user2')).toBe(true)
      expect(rateLimiter.canMakeRequest('user2')).toBe(true)
    })

    it('should reset after time window', (done) => {
      // Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.canMakeRequest('user1')
      }
      
      // Should be blocked
      expect(rateLimiter.canMakeRequest('user1')).toBe(false)
      
      // Wait for the time window to reset (1000ms + buffer)
      setTimeout(() => {
        expect(rateLimiter.canMakeRequest('user1')).toBe(true)
        done()
      }, 1100)
    })
  })

  describe('getTimeUntilReset', () => {
    it('should return time until reset', () => {
      rateLimiter.canMakeRequest('user1')
      const timeUntilReset = rateLimiter.getTimeUntilReset('user1')
      expect(timeUntilReset).toBeGreaterThan(0)
      expect(timeUntilReset).toBeLessThanOrEqual(1000)
    })

    it('should return 0 when no requests made', () => {
      expect(rateLimiter.getTimeUntilReset('user1')).toBe(0)
    })
  })
})
