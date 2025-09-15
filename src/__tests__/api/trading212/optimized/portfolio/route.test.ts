import { GET } from '../../../../../app/api/trading212/optimized/portfolio/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}))

jest.mock('@/lib/optimized-trading212', () => ({
  optimizedTrading212Service: {
    canMakeRequest: jest.fn(),
    getTimeUntilReset: jest.fn(),
    forceRefreshAccountData: jest.fn(),
    getAccountData: jest.fn(),
  },
}))

describe('Trading212 Portfolio Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/trading212/optimized/portfolio', () => {
    it('should handle unauthorized requests', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle user not found', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should handle user with no Trading212 accounts', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: []
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Trading212 accounts configured')
    })

    it('should handle specific account not found', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: true }
        ]
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio?accountId=nonexistent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })

    it('should handle successful portfolio retrieval for default account', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: true }
        ]
      })
      
      const mockAccountData = {
        portfolio: [
          { symbol: 'AAPL', quantity: 10, currentPrice: 150 }
        ],
        cacheHit: true,
        lastUpdated: new Date().toISOString()
      }
      optimizedTrading212Service.canMakeRequest.mockReturnValue(true)
      optimizedTrading212Service.getAccountData.mockResolvedValue(mockAccountData)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual(mockAccountData.portfolio)
      expect(data.connected).toBe(true)
      expect(optimizedTrading212Service.getAccountData).toHaveBeenCalledWith(
        'user1',
        'acc1',
        'key1',
        false,
        false
      )
    })

    it('should handle successful portfolio retrieval for specific account', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: true },
          { id: 'acc2', apiKey: 'key2', isPractice: true, name: 'Account 2', isDefault: false }
        ]
      })
      
      const mockAccountData = {
        portfolio: [
          { symbol: 'GOOGL', quantity: 5, currentPrice: 100 }
        ],
        cacheHit: false,
        lastUpdated: new Date().toISOString()
      }
      optimizedTrading212Service.canMakeRequest.mockReturnValue(true)
      optimizedTrading212Service.getAccountData.mockResolvedValue(mockAccountData)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio?accountId=acc2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual(mockAccountData.portfolio)
      expect(data.connected).toBe(true)
      expect(optimizedTrading212Service.getAccountData).toHaveBeenCalledWith(
        'user1',
        'acc2',
        'key2',
        true,
        false
      )
    })

    it('should handle portfolio retrieval with force refresh', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: true }
        ]
      })
      
      const mockAccountData = {
        portfolio: [],
        cacheHit: false,
        lastUpdated: new Date().toISOString()
      }
      optimizedTrading212Service.canMakeRequest.mockReturnValue(true)
      optimizedTrading212Service.forceRefreshAccountData.mockResolvedValue(mockAccountData)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio?forceRefresh=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual(mockAccountData.portfolio)
      expect(data.connected).toBe(true)
      expect(optimizedTrading212Service.forceRefreshAccountData).toHaveBeenCalledWith(
        'user1',
        'acc1',
        'key1',
        false,
        false
      )
    })

    it('should handle API errors', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: true }
        ]
      })
      
      optimizedTrading212Service.getAccountData.mockRejectedValue(new Error('API Error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch portfolio data')
    })

    it('should handle database errors', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch portfolio data')
    })

    it('should handle accounts without default account', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: false, isActive: true }
        ]
      })
      
      const mockAccountData = {
        portfolio: [],
        cacheHit: true,
        lastUpdated: new Date().toISOString()
      }
      optimizedTrading212Service.canMakeRequest.mockReturnValue(true)
      optimizedTrading212Service.getAccountData.mockResolvedValue(mockAccountData)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual(mockAccountData.portfolio)
      expect(data.connected).toBe(true)
      expect(optimizedTrading212Service.getAccountData).toHaveBeenCalledWith(
        'user1',
        'acc1',
        'key1',
        false,
        false
      )
    })

    it('should handle accounts with no active accounts', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [] // No active accounts
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Trading212 accounts configured')
    })

    it('should handle multiple accounts and select the first active one when no default', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue({
        id: 'user1',
        trading212Accounts: [
          { id: 'acc1', apiKey: 'key1', isPractice: false, name: 'Account 1', isDefault: false, isActive: true },
          { id: 'acc2', apiKey: 'key2', isPractice: true, name: 'Account 2', isDefault: false, isActive: true }
        ]
      })
      
      const mockAccountData = {
        portfolio: [],
        cacheHit: true,
        lastUpdated: new Date().toISOString()
      }
      optimizedTrading212Service.canMakeRequest.mockReturnValue(true)
      optimizedTrading212Service.getAccountData.mockResolvedValue(mockAccountData)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual(mockAccountData.portfolio)
      expect(data.connected).toBe(true)
      expect(optimizedTrading212Service.getAccountData).toHaveBeenCalledWith(
        'user1',
        'acc1',
        'key1',
        false,
        false
      )
    })
  })
})
