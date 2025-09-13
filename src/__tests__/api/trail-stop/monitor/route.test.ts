import { NextRequest } from 'next/server'
import { POST } from '@/app/api/trail-stop/monitor/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'
import { createTrailStopNotification } from '@/app/api/notifications/route'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    trailStopLossOrder: {
      findMany: jest.fn(),
      update: jest.fn()
    },
    notification: {
      create: jest.fn()
    }
  }
}))

jest.mock('@/lib/trading212')

jest.mock('@/app/api/notifications/route', () => ({
  createTrailStopNotification: jest.fn()
}))

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedPrisma = prisma as any
const mockedTrading212API = Trading212API as jest.MockedClass<typeof Trading212API>
const mockedCreateTrailStopNotification = createTrailStopNotification as jest.MockedFunction<typeof createTrailStopNotification>

// Mock user data
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  trading212Accounts: [
    {
      id: 'account-1',
      name: 'Test Account',
      apiKey: 'test-api-key',
      isActive: true,
      isPractice: false,
    },
  ],
}

describe('/api/trail-stop/monitor', () => {
  const mockActiveOrders = [
    {
      id: 'order-1',
      userId: 'user-1',
      accountId: 'account-1',
      symbol: 'AAPL',
      quantity: 10,
      trailAmount: 5.00,
      trailPercent: 3.5,
      stopPrice: 145.00,
      isActive: true,
      isPractice: false,
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        trading212Accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            apiKey: 'test-api-key',
            isActive: true,
            isPractice: false,
            isDefault: true
          }
        ]
      }
    },
    {
      id: 'order-2',
      userId: 'user-2',
      accountId: 'account-2',
      symbol: 'GOOGL',
      quantity: 5,
      trailAmount: 50.00,
      trailPercent: null,
      stopPrice: 2750.00,
      isActive: true,
      isPractice: true,
      user: {
        id: 'user-2',
        name: 'Test User 2',
        email: 'test2@example.com',
        trading212Accounts: [
          {
            id: 'account-2',
            name: 'Test Account 2',
            apiKey: 'test-api-key-2',
            isActive: true,
            isPractice: true,
            isDefault: true
          }
        ]
      }
    }
  ]

  const mockPositions = [
    {
      ticker: 'AAPL',
      currentPrice: 140.00, // Below stop price
      quantity: 10
    },
    {
      ticker: 'GOOGL',
      currentPrice: 2800.00, // Above stop price
      quantity: 5
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getServerSession to return user
    mockedGetServerSession.mockResolvedValue(mockUser as any)
    
    // Mock createTrailStopNotification
    mockedCreateTrailStopNotification.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
      type: 'trail_stop_triggered',
      title: 'Trail Stop Triggered',
      message: 'AAPL trail stop order triggered',
      createdAt: new Date()
    } as any)
    
    // Mock Trading212API with different implementations for different API keys
    mockedTrading212API.mockImplementation((apiKey: string, _isPractice?: boolean) => {
      const mockAPI = {
        getPositions: jest.fn(),
        getAccount: jest.fn()
      }
      
      // Set up different responses based on API key
      if (apiKey === 'test-api-key') {
        mockAPI.getPositions.mockResolvedValue([mockPositions[0]])
        mockAPI.getAccount.mockResolvedValue({ id: 'account-1', currencyCode: 'USD' })
      } else if (apiKey === 'test-api-key-2') {
        mockAPI.getPositions.mockResolvedValue([mockPositions[1]])
        mockAPI.getAccount.mockResolvedValue({ id: 'account-2', currencyCode: 'USD' })
      }
      
      return mockAPI as any
    })
  })

  describe('POST /api/trail-stop/monitor', () => {
    it('should process active trail stop orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockActiveOrders as any)

      mockedPrisma.trailStopLossOrder.update.mockResolvedValue({
        id: 'order-1',
        isActive: false
      } as any)

      const _request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.message).toBe('Monitored 2 orders, 1 triggered')
      expect(_data.processed).toBe(2)
      expect(_data.triggered).toBe(1)
      expect(_data.success).toBe(true)
    })

    it('should handle no active orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([])

      const _request2 = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const __data2 = await response.json()

      expect(response.status).toBe(200)
      const _data = await response.json()
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
      expect(_data.success).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      // Override the mock to return errors for this test
      mockedTrading212API.mockImplementation(() => ({
        getPositions: jest.fn().mockRejectedValue(new Error('API Error')),
        getAccount: jest.fn().mockRejectedValue(new Error('API Error'))
      }) as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
      expect(_data.success).toBe(true)
    })

    it('should create notifications for triggered orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedPrisma.trailStopLossOrder.update.mockResolvedValue({
        id: 'order-1',
        isActive: false
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(mockedCreateTrailStopNotification).toHaveBeenCalledWith('user-1', {
        symbol: 'AAPL',
        quantity: 10,
        stopPrice: 145.00,
        trailAmount: 5.00,
        trailPercent: 3.5,
        isPractice: false
      })
    })

    it('should deactivate triggered orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedPrisma.trailStopLossOrder.update.mockResolvedValue({
        id: 'order-1',
        isActive: false
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(mockedPrisma.trailStopLossOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { isActive: false }
      })
    })

    it('should handle practice vs production accounts differently', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockActiveOrders as any)

      mockedPrisma.trailStopLossOrder.update.mockResolvedValue({
        id: 'order-1',
        isActive: false
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(2)
      
      // Should create notification for production account (triggered)
      expect(mockedCreateTrailStopNotification).toHaveBeenCalledWith('user-1', {
        symbol: 'AAPL',
        quantity: 10,
        stopPrice: 145.00,
        trailAmount: 5.00,
        trailPercent: 3.5,
        isPractice: false
      })
    })

    it('should handle database errors', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(500)
      expect(_data.error).toBe('Failed to monitor trail stop orders')
    })

    it('should handle notification creation errors', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedCreateTrailStopNotification.mockRejectedValue(new Error('Notification creation failed'))

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(1)
      expect(_data.triggered).toBe(1)
      expect(_data.success).toBe(true)
    })

    it('should handle order update errors', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedPrisma.trailStopLossOrder.update.mockRejectedValue(new Error('Order update failed'))

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(1)
      expect(_data.triggered).toBe(1)
      expect(_data.success).toBe(true)
    })

    it('should handle missing position data', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      // Override the mock to return empty positions for this test
      mockedTrading212API.mockImplementation(() => ({
        getPositions: jest.fn().mockResolvedValue([]), // No positions
        getAccount: jest.fn().mockResolvedValue({ id: 'account-1', currencyCode: 'USD' })
      }) as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with no Trading212 account', async () => {
      const orderWithoutAccount = {
        ...mockActiveOrders[0],
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: []
        }
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithoutAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
    })

    it('should handle orders with Trading212 account but no API key', async () => {
      const orderWithoutApiKey = {
        ...mockActiveOrders[0],
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [{
            id: 'acc-1',
            apiKey: null,
            isPractice: false
          }]
        }
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithoutApiKey] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
    })

    it('should handle orders with specific account ID', async () => {
      const orderWithAccountId = {
        ...mockActiveOrders[0],
        accountId: 'specific-account-id'
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithAccountId] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with fallback to default account', async () => {
      const orderWithDefaultAccount = {
        ...mockActiveOrders[0],
        accountId: null,
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [
            { id: 'acc-1', isDefault: false, isActive: true, apiKey: 'test-key', isPractice: false },
            { id: 'acc-2', isDefault: true, isActive: true, apiKey: 'default-key', isPractice: false }
          ]
        }
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithDefaultAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with fallback to first active account', async () => {
      const orderWithActiveAccount = {
        ...mockActiveOrders[0],
        accountId: null,
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [
            { id: 'acc-1', isDefault: false, isActive: true, apiKey: 'active-key', isPractice: false },
            { id: 'acc-2', isDefault: false, isActive: false, apiKey: 'inactive-key', isPractice: false }
          ]
        }
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithActiveAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with fallback to first account when no default or active', async () => {
      const orderWithFirstAccount = {
        ...mockActiveOrders[0],
        accountId: null,
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [
            { id: 'acc-1', isDefault: false, isActive: false, apiKey: 'first-key', isPractice: false }
          ]
        }
      }
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithFirstAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle positions not found for order symbol', async () => {
      const mockTrading212API = {
        getPositions: jest.fn().mockResolvedValue([
          { ticker: 'GOOGL', currentPrice: 2800.00 }
        ])
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
    })

    it('should handle Trading212 API errors', async () => {
      const mockTrading212API = {
        getPositions: jest.fn().mockRejectedValue(new Error('API Error'))
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.processed).toBe(0)
      expect(_data.triggered).toBe(0)
    })

    it('should handle orders with no positions data', async () => {
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({ positions: [] })
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockActiveOrders as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with null positions data', async () => {
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({ positions: null })
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockActiveOrders as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with undefined positions data', async () => {
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({})
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockActiveOrders as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with positions but no matching symbol', async () => {
      const orderWithDifferentSymbol = {
        ...mockActiveOrders[0],
        symbol: 'DIFFERENT'
      }
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({ positions: [{ ticker: 'AAPL', quantity: 100, currentPrice: 150 }] })
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithDifferentSymbol] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with practice account', async () => {
      const orderWithPracticeAccount = {
        ...mockActiveOrders[0],
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [
            { id: 'acc-1', isDefault: true, isActive: true, apiKey: 'test-key', isPractice: true }
          ]
        }
      }
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({ positions: [{ ticker: 'AAPL', quantity: 100, currentPrice: 150 }] })
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithPracticeAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })

    it('should handle orders with live account', async () => {
      const orderWithLiveAccount = {
        ...mockActiveOrders[0],
        user: {
          ...mockActiveOrders[0].user,
          trading212Accounts: [
            { id: 'acc-1', isDefault: true, isActive: true, apiKey: 'test-key', isPractice: false }
          ]
        }
      }
      const mockTrading212API = {
        getAccountInfo: jest.fn().mockResolvedValue({ account: { currency: 'USD', cash: 1000 } }),
        getPositions: jest.fn().mockResolvedValue({ positions: [{ ticker: 'AAPL', quantity: 100, currentPrice: 150 }] })
      }
      mockedTrading212API.mockImplementation(() => mockTrading212API as any)

      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([orderWithLiveAccount] as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST()
      const _data = await response.json()

      expect(response.status).toBe(200)
      expect(_data.success).toBe(true)
    })
  })
})
