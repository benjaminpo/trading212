// Simple test to improve coverage for api-batcher.ts
import { APIBatcher } from '@/lib/api-batcher'

// Mock Trading212API
jest.mock('@/lib/trading212', () => ({
  Trading212API: jest.fn().mockImplementation(() => ({
    getAccount: jest.fn().mockResolvedValue({ id: 'test-account' }),
    getPositions: jest.fn().mockResolvedValue([]),
    getOrders: jest.fn().mockResolvedValue([])
  }))
}))

// Mock apiCache
jest.mock('@/lib/api-cache', () => ({
  apiCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, size: 0 })
  }
}))

describe('APIBatcher - Simple Coverage Tests', () => {
  let batcher: APIBatcher

  beforeEach(() => {
    // Clear any existing instance
    (APIBatcher as any).instance = undefined
    batcher = new APIBatcher()
  })

  it('should create singleton instance', () => {
    const instance1 = APIBatcher.getInstance()
    const instance2 = APIBatcher.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should have getStats method', () => {
    expect(typeof batcher.getStats).toBe('function')
  })

  it('should return stats object', () => {
    const stats = batcher.getStats()
    expect(typeof stats).toBe('object')
    expect(stats).toHaveProperty('pendingBatches')
  })

  it('should have request method', () => {
    expect(typeof batcher.request).toBe('function')
  })

  it('should have fetchAccountData method', () => {
    expect(typeof batcher.fetchAccountData).toBe('function')
  })

  it('should have fetchMultiAccountData method', () => {
    expect(typeof batcher.fetchMultiAccountData).toBe('function')
  })

  it('should handle invalid request type', async () => {
    await expect(
      batcher.request(
        'user123',
        'account456',
        'invalid' as any,
        'api-key',
        false
      )
    ).rejects.toThrow()
  })
})
