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
const mockedPrisma = prisma as jest.Mocked<typeof prisma>
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
    mockedTrading212API.mockImplementation((apiKey: string, isPractice: boolean) => {
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

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Monitored 2 orders, 1 triggered')
      expect(data.processed).toBe(2)
      expect(data.triggered).toBe(1)
      expect(data.success).toBe(true)
    })

    it('should handle no active orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.triggered).toBe(0)
      expect(data.success).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      // Override the mock to return errors for this test
      mockedTrading212API.mockImplementation(() => ({
        getPositions: jest.fn().mockRejectedValue(new Error('API Error')),
        getAccount: jest.fn().mockRejectedValue(new Error('API Error'))
      }) as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.triggered).toBe(0)
      expect(data.success).toBe(true)
    })

    it('should create notifications for triggered orders', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedPrisma.trailStopLossOrder.update.mockResolvedValue({
        id: 'order-1',
        isActive: false
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

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
      const response = await POST(request)
      const data = await response.json()

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
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(2)
      
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
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to monitor trail stop orders')
    })

    it('should handle notification creation errors', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedCreateTrailStopNotification.mockRejectedValue(new Error('Notification creation failed'))

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
      expect(data.triggered).toBe(1)
      expect(data.success).toBe(true)
    })

    it('should handle order update errors', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      mockedPrisma.trailStopLossOrder.update.mockRejectedValue(new Error('Order update failed'))

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
      expect(data.triggered).toBe(1)
      expect(data.success).toBe(true)
    })

    it('should handle missing position data', async () => {
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([mockActiveOrders[0]] as any)

      // Override the mock to return empty positions for this test
      mockedTrading212API.mockImplementation(() => ({
        getPositions: jest.fn().mockResolvedValue([]), // No positions
        getAccount: jest.fn().mockResolvedValue({ id: 'account-1', currencyCode: 'USD' })
      }) as any)

      const request = new NextRequest('http://localhost:3000/api/trail-stop/monitor', { method: 'POST' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.triggered).toBe(0)
      expect(data.success).toBe(true)
    })
  })
})
