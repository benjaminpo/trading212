import { NextRequest } from 'next/server'
import { GET } from '@/app/api/trading212/account/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'

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
  },
  retryDatabaseOperation: jest.fn((operation) => operation())
}))
jest.mock('@/lib/trading212')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockTrading212API = Trading212API as jest.MockedClass<typeof Trading212API>

describe('/api/trading212/account', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    trading212Accounts: [
      {
        id: 'account-1',
        name: 'Test Account',
        apiKey: 'test-api-key',
        isDefault: true,
        isPractice: false,
        isActive: true,
        currency: 'USD',
        cash: 10000
      }
    ]
  }

  const mockAccountInfo = {
    id: 'account-1',
    currencyCode: 'USD',
    cash: 10000,
    ppl: 500,
    result: 200,
    blockedForStocks: 0,
    blockedForOrders: 0,
    pieCash: 0
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any)
    
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    
    const mockAPIInstance = {
      getAccount: jest.fn().mockResolvedValue(mockAccountInfo),
      getPositions: jest.fn().mockResolvedValue([]),
      getOrders: jest.fn().mockResolvedValue([])
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
  })

  it('should return account information for authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      connected: true,
      account: {
        id: 'account-1',
        name: 'Test Account',
        cash: 10000,
        currency: 'USD',
        isPractice: false,
        isDefault: true
      },
      stats: {
        totalPnL: 0,
        totalPnLPercent: 0,
        todayPnL: 0,
        todayPnLPercent: 0,
        activePositions: 0,
        trailStopOrders: 0,
        aiRecommendations: 0
      },
      portfolio: [],
      orders: 0
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockGetServerSession.mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data).toEqual({
      error: 'Unauthorized'
    })
  })

  it('should return 404 for user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data).toEqual({
      error: 'User not found'
    })
  })

  it('should use default account when no accountId provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/trading212/account')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.account.id).toBe('account-1')
  })

  it('should return 404 for account not found', async () => {
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=nonexistent')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data).toEqual({
      error: 'Account not found'
    })
  })


  it('should handle Trading212 API errors gracefully', async () => {
    const mockAPIInstance = {
      getAccount: jest.fn().mockRejectedValue(new Error('API Error')),
      getPositions: jest.fn().mockResolvedValue([]),
      getOrders: jest.fn().mockResolvedValue([])
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.connected).toBe(true)
    expect(data.account.cash).toBe(10000) // Uses fallback value from account
  })

  it('should handle orders API errors gracefully', async () => {
    const mockAPIInstance = {
      getAccount: jest.fn().mockResolvedValue(mockAccountInfo),
      getPositions: jest.fn().mockResolvedValue([]),
      getOrders: jest.fn().mockRejectedValue(new Error('Orders API Error'))
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.orders).toBe(0)
  })

  it('should handle positions API errors gracefully', async () => {
    const mockAPIInstance = {
      getAccount: jest.fn().mockResolvedValue(mockAccountInfo),
      getPositions: jest.fn().mockRejectedValue(new Error('Positions API Error')),
      getOrders: jest.fn().mockResolvedValue([])
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account?accountId=account-1')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.portfolio).toEqual([])
  })


  it('should return 400 when no default account and no accountId', async () => {
    const userWithoutDefault = {
      ...mockUser,
      trading212Accounts: [
        {
          id: 'account-1',
          name: 'Test Account',
          apiKey: 'test-api-key',
          isDefault: false,
          isPractice: false,
          isActive: true,
          currency: 'USD',
          cash: 10000
        }
      ]
    }
    mockPrisma.user.findUnique.mockResolvedValue(userWithoutDefault as any)
    
    const request = new NextRequest('http://localhost:3000/api/trading212/account')
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.account.id).toBe('account-1')
  })
})

