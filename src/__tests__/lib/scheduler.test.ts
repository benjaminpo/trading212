import { DailyAnalysisScheduler } from '@/lib/scheduler'

// Mock dependencies to avoid complex integration issues
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    aIAnalysisLog: {
      create: jest.fn(),
    },
    aIRecommendation: {
      create: jest.fn(),
    },
    marketData: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/trading212', () => ({
  Trading212API: jest.fn().mockImplementation(() => ({
    getPositions: jest.fn().mockResolvedValue([]),
    getAccount: jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' }),
  })),
}))

jest.mock('@/lib/ai-service', () => ({
  aiAnalysisService: {
    analyzePosition: jest.fn().mockResolvedValue({
      action: 'HOLD',
      confidence: 0.75,
      reasoning: 'Test reasoning',
      targetPrice: 165.00,
      stopLoss: 145.00,
    }),
  },
}))

describe('DailyAnalysisScheduler', () => {
  let scheduler: DailyAnalysisScheduler
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    scheduler = DailyAnalysisScheduler.getInstance()
  })

  afterEach(() => {
    scheduler.stop()
    jest.useRealTimers()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DailyAnalysisScheduler.getInstance()
      const instance2 = DailyAnalysisScheduler.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should maintain singleton pattern', () => {
      const instance1 = DailyAnalysisScheduler.getInstance()
      const instance2 = DailyAnalysisScheduler.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('start/stop functionality', () => {
    it('should start the scheduler', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      scheduler.start()
      
      expect(consoleSpy).toHaveBeenCalledWith('Starting daily analysis scheduler...')
      consoleSpy.mockRestore()
    })

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      scheduler.start()
      scheduler.start() // Try to start again
      
      expect(consoleSpy).toHaveBeenCalledWith('Starting daily analysis scheduler...')
      expect(consoleSpy).toHaveBeenCalledWith('Daily analysis scheduler is already running')
      consoleSpy.mockRestore()
    })

    it('should stop the scheduler', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      scheduler.start()
      scheduler.stop()
      
      expect(consoleSpy).toHaveBeenCalledWith('Daily analysis scheduler stopped')
      consoleSpy.mockRestore()
    })

    it('should handle stopping when not running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      scheduler.stop() // Stop without starting
      
      expect(consoleSpy).toHaveBeenCalledWith('Daily analysis scheduler stopped')
      consoleSpy.mockRestore()
    })
  })

  describe('analyzeUser', () => {
    const { prisma } = require('@/lib/prisma')

    it('should analyze a specific user', async () => {
      const mockUser = {
        trading212Accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            apiKey: 'test-api-key',
            isPractice: true
          }
        ]
      }
      
      prisma.user.findUnique.mockResolvedValue(mockUser)
      prisma.aIAnalysisLog.create.mockResolvedValue({ id: 'log-1' })

      await scheduler.analyzeUser('test-user-id')
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: {
          trading212Accounts: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              apiKey: true,
              isPractice: true
            }
          }
        }
      })
    })

    it('should throw error for user without Trading212 connection', async () => {
      prisma.user.findUnique.mockResolvedValue({
        trading212Accounts: []
      })

      await expect(scheduler.analyzeUser('test-user-id')).rejects.toThrow(
        'User does not have active Trading212 accounts'
      )
    })

    it('should throw error for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(scheduler.analyzeUser('non-existent-user')).rejects.toThrow(
        'User does not have active Trading212 accounts'
      )
    })
  })

  describe('Basic functionality tests', () => {
    it('should be able to get instance multiple times', () => {
      const instance1 = DailyAnalysisScheduler.getInstance()
      const instance2 = DailyAnalysisScheduler.getInstance()
      const instance3 = DailyAnalysisScheduler.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance2).toBe(instance3)
      expect(instance1).toBe(instance3)
    })

    it('should handle start and stop cycles', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      scheduler.start()
      scheduler.stop()
      scheduler.start()
      scheduler.stop()
      
      expect(consoleSpy).toHaveBeenCalledWith('Starting daily analysis scheduler...')
      expect(consoleSpy).toHaveBeenCalledWith('Daily analysis scheduler stopped')
      
      consoleSpy.mockRestore()
    })
  })
})