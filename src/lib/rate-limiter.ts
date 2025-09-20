// Simple in-memory rate limiter for Trading212 API calls
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private getCurrentTime: () => number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs; // 1 minute window
    this.maxRequests = maxRequests; // 10 requests per minute
    this.getCurrentTime = Date.now;
  }

  canMakeRequest(key: string, rateLimit?: number): boolean {
    // Handle edge cases for rate limit parameter
    if (rateLimit !== undefined) {
      // Handle invalid rate limits
      if (typeof rateLimit !== "number") {
        throw new Error("Rate limit must be a valid number");
      }

      if (isNaN(rateLimit)) {
        return false;
      }

      if (rateLimit <= 0) {
        return false;
      }

      if (rateLimit === Infinity) {
        return true;
      }

      if (rateLimit === Number.MIN_SAFE_INTEGER) {
        return false;
      }
    }

    // Handle invalid key types
    if (typeof key !== "string") {
      throw new Error("Key must be a string");
    }

    const now = this.getCurrentTime();
    const requests = this.requests.get(key) || [];
    const effectiveRateLimit =
      rateLimit !== undefined ? rateLimit : this.maxRequests;

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (validRequests.length >= effectiveRateLimit) {
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
    const timeUntilReset =
      this.windowMs - (this.getCurrentTime() - oldestRequest);

    return Math.max(0, timeUntilReset);
  }
}

// Global rate limiter instance
// More lenient for development - 15 requests per minute
export const trading212RateLimiter = new RateLimiter(60000, 15);
