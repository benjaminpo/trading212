import { NextRequest } from 'next/server'
import { GET } from '@/app/api/trading212/portfolio/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'
import { trading212RateLimiter } from '@/lib/rate-limiter'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    trading212Account: {
      update: jest.fn()
    }
  }
}))

jest.mock('@/lib/trading212')
jest.mock('@/lib/rate-limiter')

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const mockedTrading212API = Trading212API as jest.MockedClass<typeof Trading212API>
const mockedRateLimiter = trading212RateLimiter as jest.Mocked<typeof trading212RateLimiter>

describe('/api/trading212/portfolio', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    trading212Accounts: [
      {
        id: 'account-1',
        name: 'Test Account',
        apiKey: 'test-api-key',
        isPractice: false,
        isActive: true,
        isDefault: true
      }
    ]
  }

  const mockPositions = [
    {
      ticker: 'AAPL',
      quantity: 10,
      currentPrice: 150.00,
      averagePrice: 145.00,
      ppl: 50.00,
      pplPercent: 3.45,
      value: 1500.00
    },
    {
      ticker: 'GOOGL',
      quantity: 5,
      currentPrice: 2800.00,
      averagePrice: 2900.00,
      ppl: -500.00,
      pplPercent: -3.45,
      value: 14000.00
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock rate limiter
    mockedRateLimiter.canMakeRequest.mockReturnValue(true)
    mockedRateLimiter.getTimeUntilReset.mockReturnValue(0)
    
    // Mock Trading212API
    const mockAPI = {
      getPositions: jest.fn(),
      getAccount: jest.fn()
    }
    mockedTrading212API.mockImplementation(() => mockAPI as any)
  })

  describe('GET /api/trading212/portfolio', () => {
    it('should return portfolio data for authenticated user', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('test-api-key', false)
      mockAPI.getPositions = jest.fn().mockResolvedValue(mockPositions)
      mockAPI.getAccount = jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' })

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toHaveLength(2)
      expect(data.positions[0].ticker).toBe('AAPL')
      expect(data.totalValue).toBe(15500.00) // No conversion needed: Trading212 API returns values in main currency units
      expect(data.totalPnL).toBe(-450.00) // No conversion needed: Trading212 API returns values in main currency units
    })

    it('should handle specific account ID', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('test-api-key', false)
      mockAPI.getPositions = jest.fn().mockResolvedValue(mockPositions)
      mockAPI.getAccount = jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' })

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio?accountId=account-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toHaveLength(2)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for user not found', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 for account not found', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        trading212Accounts: []
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio?accountId=nonexistent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })

    it('should return 400 for no Trading212 accounts', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        trading212Accounts: []
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Trading212 accounts configured')
    })

    it('should handle rate limiting', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockedRateLimiter.canMakeRequest.mockReturnValue(false)
      mockedRateLimiter.getTimeUntilReset.mockReturnValue(30000)

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.retryAfter).toBe(30)
    })

    it('should handle API errors gracefully', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('test-api-key', false)
      mockAPI.getPositions = jest.fn().mockRejectedValue(new Error('API Error'))
      mockAPI.getAccount = jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' })

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions).toEqual([])
      expect(data.totalValue).toBe(0)
      expect(data.totalPnL).toBe(0)
    })

    it('should calculate P/L percentages correctly', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('test-api-key', false)
      mockAPI.getPositions = jest.fn().mockResolvedValue(mockPositions)
      mockAPI.getAccount = jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' })

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalPnLPercent).toBeCloseTo(-2.82, 2) // -450 / (15500 - (-450)) * 100
    })

    it('should handle positions with missing P/L percentage', async () => {
      const positionsWithMissingPpl = [
        {
          ticker: 'AAPL',
          quantity: 10,
          currentPrice: 150.00,
          averagePrice: 145.00,
          ppl: 50.00,
          pplPercent: null,
          value: 1500.00
        }
      ]

      mockedGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('test-api-key', false)
      mockAPI.getPositions = jest.fn().mockResolvedValue(positionsWithMissingPpl)
      mockAPI.getAccount = jest.fn().mockResolvedValue({ cash: 10000, currencyCode: 'USD' })

      const request = new NextRequest('http://localhost:3000/api/trading212/portfolio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.positions[0].pplPercent).toBeCloseTo(3.45, 2) // Calculated fallback
    })

  })
})
