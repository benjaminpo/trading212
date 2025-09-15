import { optimizedTrading212Service, OptimizedAccountData } from '@/lib/optimized-trading212'
import { apiBatcher } from '@/lib/api-batcher'
import { apiCache } from '@/lib/api-cache'
import { trading212RateLimiter } from '@/lib/rate-limiter'

// Mock dependencies
jest.mock('@/lib/api-batcher')
jest.mock('@/lib/api-cache')
jest.mock('@/lib/rate-limiter')

const mockApiBatcher = apiBatcher as jest.Mocked<typeof apiBatcher>
const mockApiCache = apiCache as jest.Mocked<typeof apiCache>
const mockRateLimiter = trading212RateLimiter as jest.Mocked<typeof trading212RateLimiter>

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

describe('OptimizedTrading212Service', () => {
  const userId = 'user123'
  const accountId = 'account456'
  const apiKey = 'test-api-key'
  const isPractice = true

  const mockAccountData = {
    account: { id: 'account1', currencyCode: 'USD', cash: 10000 },
    portfolio: [{ ticker: 'AAPL', quantity: 100, currentPrice: 150, ppl: 1000 }],
    orders: [{ id: 1, ticker: 'AAPL', status: 'pending' }],
    stats: {
      activePositions: 1,
      totalPnL: 1000,
      totalPnLPercent: 10,
      totalValue: 15000
    }
  }

  const mockPortfolioData = {
    positions: [{ ticker: 'AAPL', quantity: 100, currentPrice: 150, ppl: 1000 }],
    totalValue: 15000,
    totalPnL: 1000,
    totalPnLPercent: 10,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    cacheHit: false
  }

  beforeEach(() => {
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
    
    // Reset mocks
    mockApiCache.get.mockResolvedValue(null)
    mockApiCache.set.mockResolvedValue(undefined)
    mockApiBatcher.fetchAccountData.mockResolvedValue(mockAccountData)
    mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
      { accountId: 'account1', data: mockAccountData, error: undefined }
    ])
    mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
      { accountId: 'account1', data: mockAccountData, error: undefined }
    ])
    mockApiBatcher.request.mockResolvedValue(mockPortfolioData.positions)
    mockRateLimiter.canMakeRequest.mockReturnValue(true)
    mockRateLimiter.getTimeUntilReset.mockReturnValue(0)
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = optimizedTrading212Service
      const instance2 = optimizedTrading212Service
      expect(instance1).toBe(instance2)
    })
  })

  describe('Account Data Fetching', () => {
    it('should return cached data when available', async () => {
      const cachedData: OptimizedAccountData = {
        ...mockAccountData,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        cacheHit: true
      }

      mockApiCache.get.mockResolvedValue(cachedData)

      const result = await optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        true
      )

      expect(result).toEqual({
        ...cachedData,
        cacheHit: true
      })
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Cache HIT'))
    })

    it('should fetch fresh data when cache miss', async () => {
      mockApiCache.get.mockResolvedValue(null)

      const result = await optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        true
      )

      expect(result.account).toEqual(mockAccountData.account)
      expect(result.portfolio).toEqual(mockAccountData.portfolio)
      expect(result.orders).toEqual(mockAccountData.orders)
      expect(result.stats).toMatchObject({
        activePositions: mockAccountData.stats.activePositions,
        totalPnL: mockAccountData.stats.totalPnL,
        totalPnLPercent: mockAccountData.stats.totalPnLPercent,
        totalValue: mockAccountData.stats.totalValue
      })
      expect(result.cacheHit).toBe(false)
      expect(mockApiCache.set).toHaveBeenCalled()
    })

    it('should handle fetch without orders', async () => {
      mockApiCache.get.mockResolvedValue(null)
      const dataWithoutOrders = { ...mockAccountData, orders: undefined }
      mockApiBatcher.fetchAccountData.mockResolvedValue(dataWithoutOrders)

      const result = await optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        false
      )

      expect(result.orders).toEqual([])
    })

    it('should calculate today PnL and percentage', async () => {
      mockApiCache.get.mockResolvedValue(null)

      const result = await optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        true
      )

      expect(result.stats).toMatchObject({
        todayPnL: 0,
        todayPnLPercent: 0
      })
    })
  })

  describe('Portfolio Data Fetching', () => {
    it('should return cached portfolio data', async () => {
      mockApiCache.get.mockResolvedValue(mockPortfolioData)

      const result = await optimizedTrading212Service.getPortfolioData(
        userId,
        accountId,
        apiKey,
        isPractice
      )

      expect(result).toEqual({
        ...mockPortfolioData,
        cacheHit: true
      })
    })

    it('should fetch fresh portfolio data', async () => {
      mockApiCache.get.mockResolvedValue(null)

      const result = await optimizedTrading212Service.getPortfolioData(
        userId,
        accountId,
        apiKey,
        isPractice
      )

      expect(result.positions).toEqual(mockPortfolioData.positions)
      expect(result.totalValue).toBe(15000)
      expect(result.totalPnL).toBe(1000)
      expect(result.totalPnLPercent).toBeCloseTo(7.14, 2)
      expect(result.cacheHit).toBe(false)
    })

    it('should handle empty portfolio', async () => {
      mockApiCache.get.mockResolvedValue(null)
      mockApiBatcher.request.mockResolvedValue([])

      const result = await optimizedTrading212Service.getPortfolioData(
        userId,
        accountId,
        apiKey,
        isPractice
      )

      expect(result.totalValue).toBe(0)
      expect(result.totalPnL).toBe(0)
      expect(result.totalPnLPercent).toBe(0)
    })
  })

  describe('Multi-Account Data Fetching', () => {
    const accounts = [
      { id: 'account1', apiKey: 'key1', isPractice: true, name: 'Account 1' },
      { id: 'account2', apiKey: 'key2', isPractice: false, name: 'Account 2' }
    ]

    beforeEach(() => {
      mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
        { accountId: 'account1', data: mockAccountData, error: undefined },
        { accountId: 'account2', data: { ...mockAccountData, stats: { ...mockAccountData.stats, totalPnL: 2000 } }, error: undefined }
      ])
    })

    it('should fetch data for multiple accounts', async () => {
      const result = await optimizedTrading212Service.getMultiAccountData(
        userId,
        accounts,
        true
      )

      expect(result).toHaveLength(2)
      expect(result[0].accountId).toBe('account1')
      expect(result[1].accountId).toBe('account2')
      expect(result[0].data).toBeDefined()
      expect(result[1].data).toBeDefined()
      expect(result[0].cacheHit).toBe(false)
    })

    it('should handle errors for individual accounts', async () => {
      mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
        { accountId: 'account1', data: mockAccountData, error: undefined },
        { accountId: 'account2', data: null, error: 'API Error' }
      ])

      const result = await optimizedTrading212Service.getMultiAccountData(
        userId,
        accounts,
        false
      )

      expect(result[0].data).toBeDefined()
      expect(result[1].data).toBeNull()
      expect(result[1].error).toBe('API Error')
    })
  })

  describe('Aggregated Account Data', () => {
    const accounts = [
      { id: 'account1', apiKey: 'key1', isPractice: true, name: 'Account 1' },
      { id: 'account2', apiKey: 'key2', isPractice: false, name: 'Account 2' }
    ]

    beforeEach(() => {
      mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
        { accountId: 'account1', data: mockAccountData, error: undefined },
        { accountId: 'account2', data: { 
          ...mockAccountData, 
          stats: { 
            ...mockAccountData.stats, 
            totalPnL: 2000, 
            totalValue: 30000,
            activePositions: 2
          } 
        }, error: undefined }
      ])
    })

    it('should aggregate stats from multiple accounts', async () => {
      const result = await optimizedTrading212Service.getAggregatedAccountData(
        userId,
        accounts
      )

      expect(result.totalStats).toMatchObject({
        activePositions: 3, // 1 + 2
        totalPnL: 3000, // 1000 + 2000
        totalValue: 45000, // 15000 + 30000
        connectedAccounts: 2
      })
      expect(result.totalStats.totalPnLPercent).toBeCloseTo(7.14, 2)
    })

    it('should handle zero total value', async () => {
      mockApiBatcher.fetchMultiAccountData.mockResolvedValue([
        { accountId: 'account1', data: { 
          ...mockAccountData, 
          stats: { ...mockAccountData.stats, totalValue: 0, totalPnL: 0 } 
        }, error: undefined }
      ])

      const result = await optimizedTrading212Service.getAggregatedAccountData(
        userId,
        [{ id: 'account1', apiKey: 'key1', isPractice: true, name: 'Account 1' }]
      )

      expect(result.totalStats.totalPnLPercent).toBe(0)
    })

    it('should count cache hits', async () => {
      const result = await optimizedTrading212Service.getAggregatedAccountData(
        userId,
        accounts
      )

      expect(result.cacheHits).toBe(0) // No cache hits in this test
    })
  })

  describe('Rate Limiting', () => {
    it('should check if request can be made', () => {
      const canMake = optimizedTrading212Service.canMakeRequest(userId, accountId)
      expect(mockRateLimiter.canMakeRequest).toHaveBeenCalledWith(`trading212-${userId}-${accountId}`)
      expect(canMake).toBe(true)
    })

    it('should get time until reset', () => {
      mockRateLimiter.getTimeUntilReset.mockReturnValue(5000)
      
      const timeUntilReset = optimizedTrading212Service.getTimeUntilReset(userId, accountId)
      
      expect(mockRateLimiter.getTimeUntilReset).toHaveBeenCalledWith(`trading212-${userId}-${accountId}`)
      expect(timeUntilReset).toBe(5000)
    })
  })

  describe('Cache Management', () => {
    it('should invalidate cache', async () => {
      await optimizedTrading212Service.invalidateCache(userId, accountId, 'portfolio')

      expect(mockApiCache.invalidate).toHaveBeenCalledWith(userId, accountId, 'portfolio')
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Cache invalidated'))
    })

    it('should invalidate all cache for user', async () => {
      await optimizedTrading212Service.invalidateCache(userId)

      expect(mockApiCache.invalidate).toHaveBeenCalledWith(userId, undefined, undefined)
    })

    it('should invalidate cache by data type', async () => {
      await optimizedTrading212Service.invalidateCache(userId, undefined, 'portfolio')

      expect(mockApiCache.invalidate).toHaveBeenCalledWith(userId, undefined, 'portfolio')
    })
  })

  describe('Force Refresh', () => {
    it('should force refresh account data', async () => {
      await optimizedTrading212Service.forceRefreshAccountData(
        userId,
        accountId,
        apiKey,
        isPractice,
        true
      )

      expect(mockApiCache.invalidate).toHaveBeenCalledWith(userId, accountId, 'account')
      expect(mockApiBatcher.fetchAccountData).toHaveBeenCalled()
    })
  })

  describe('Background Sync', () => {
    const accounts = [
      { id: 'account1', apiKey: 'key1', isPractice: true, name: 'Account 1' }
    ]

    it('should perform background sync when rate limits allow', async () => {
      mockRateLimiter.canMakeRequest.mockReturnValue(true)

      await optimizedTrading212Service.backgroundSync(userId, accounts)

      expect(mockApiBatcher.fetchMultiAccountData).toHaveBeenCalledWith(userId, accounts, false)
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Background sync completed'))
    })

    it('should skip sync when rate limited', async () => {
      mockRateLimiter.canMakeRequest.mockReturnValue(false)

      await optimizedTrading212Service.backgroundSync(userId, accounts)

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('All accounts are rate limited'))
    })

    it('should handle sync errors gracefully', async () => {
      mockRateLimiter.canMakeRequest.mockReturnValue(true)
      mockApiBatcher.fetchMultiAccountData.mockRejectedValue(new Error('Sync failed'))

      await optimizedTrading212Service.backgroundSync(userId, accounts)

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Background sync failed:', expect.any(Error))
    })
  })

  describe('Statistics', () => {
    it('should get batch statistics', () => {
      mockApiBatcher.getStats.mockReturnValue({
        pendingBatches: 2,
        totalPendingRequests: 5
      })

      const stats = optimizedTrading212Service.getBatchStats()

      expect(stats).toEqual({
        pendingBatches: 2,
        totalPendingRequests: 5
      })
    })

    it('should get cache statistics', () => {
      mockApiCache.getStats.mockReturnValue({
        totalEntries: 10,
        memoryUsage: 10240
      })

      const stats = optimizedTrading212Service.getCacheStats()

      expect(stats).toEqual({
        totalEntries: 10,
        memoryUsage: 10240
      })
    })
  })

  describe('Health Check', () => {
    it('should provide health check information', async () => {
      mockApiCache.getStats.mockReturnValue({ totalEntries: 5, memoryUsage: 5120 })
      mockApiBatcher.getStats.mockReturnValue({ pendingBatches: 1, totalPendingRequests: 3 })

      const health = await optimizedTrading212Service.healthCheck()

      expect(health).toEqual({
        cache: { totalEntries: 5, memoryUsage: 5120 },
        batches: { pendingBatches: 1, totalPendingRequests: 3 },
        rateLimiter: { canMakeRequest: true }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API batcher errors', async () => {
      mockApiCache.get.mockResolvedValue(null)
      mockApiBatcher.fetchAccountData.mockRejectedValue(new Error('Batcher error'))

      await expect(optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice
      )).rejects.toThrow('Batcher error')
    })

    it('should handle cache errors', async () => {
      mockApiCache.get.mockRejectedValue(new Error('Cache error'))

      await expect(optimizedTrading212Service.getAccountData(
        userId,
        accountId,
        apiKey,
        isPractice
      )).rejects.toThrow('Cache error')
    })
  })
})
