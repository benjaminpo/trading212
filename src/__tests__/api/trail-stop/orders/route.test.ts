import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/trail-stop/orders/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies - removed local NextAuth mocks to use global mocks

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    trailStopLossOrder: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedPrisma = prisma as any

describe('/api/trail-stop/orders', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  const mockTrailStopOrders = [
    {
      id: 'order-1',
      userId: 'test-user-id',
      accountId: 'account-1',
      symbol: 'AAPL',
      quantity: 10,
      trailAmount: 5.0,
      trailPercent: null,
      stopPrice: 145.0,
      isActive: true,
      isPractice: false,
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    },
    {
      id: 'order-2',
      userId: 'test-user-id',
      accountId: 'account-2',
      symbol: 'GOOGL',
      quantity: 5,
      trailAmount: 0,
      trailPercent: 3.5,
      stopPrice: null,
      isActive: true,
      isPractice: true,
      createdAt: '2024-01-01T09:00:00.000Z',
      updatedAt: '2024-01-01T09:00:00.000Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/trail-stop/orders', () => {
    it('should return trail stop orders for authenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue(mockTrailStopOrders)

      const request = new NextRequest('http://localhost/api/trail-stop/orders')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ orders: mockTrailStopOrders })
      expect(mockedPrisma.trailStopLossOrder.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no orders exist', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.trailStopLossOrder.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/trail-stop/orders')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ orders: [] })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/trail-stop/orders')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should handle database errors', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.trailStopLossOrder.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/trail-stop/orders')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch orders' })
    })
  })

  describe('POST /api/trail-stop/orders', () => {
    const validOrderData = {
      symbol: 'AAPL',
      quantity: '10',
      trailAmount: '5.0',
      isPractice: false,
      accountId: 'account-1',
    }

    it('should create trail stop order with trail amount', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      const createdOrder = {
        id: 'new-order-id',
        userId: 'test-user-id',
        accountId: 'account-1',
        symbol: 'AAPL',
        quantity: 10,
        trailAmount: 5.0,
        trailPercent: null,
        stopPrice: null,
        isActive: true,
        isPractice: false,
        createdAt: '2025-09-11T13:20:03.881Z',
        updatedAt: '2025-09-11T13:20:03.881Z',
      }
      mockedPrisma.trailStopLossOrder.create.mockResolvedValue(createdOrder)

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        order: createdOrder,
        message: 'Trail stop order created successfully',
      })
      expect(mockedPrisma.trailStopLossOrder.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          accountId: 'account-1',
          symbol: 'AAPL',
          quantity: 10,
          trailAmount: 5.0,
          trailPercent: null,
          isPractice: false,
          isActive: true,
        },
      })
    })

    it('should create trail stop order with trail percentage', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      const percentOrderData = {
        symbol: 'GOOGL',
        quantity: '5',
        trailPercent: '3.5',
        isPractice: true,
        accountId: 'account-2',
      }

      const createdOrder = {
        id: 'new-order-id',
        userId: 'test-user-id',
        accountId: 'account-2',
        symbol: 'GOOGL',
        quantity: 5,
        trailAmount: 0,
        trailPercent: 3.5,
        stopPrice: null,
        isActive: true,
        isPractice: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockedPrisma.trailStopLossOrder.create.mockResolvedValue(createdOrder)

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(percentOrderData),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockedPrisma.trailStopLossOrder.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          accountId: 'account-2',
          symbol: 'GOOGL',
          quantity: 5,
          trailAmount: 0,
          trailPercent: 3.5,
          isPractice: true,
          isActive: true,
        },
      })
    })

    it('should create order without accountId', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      const orderWithoutAccount = {
        symbol: 'MSFT',
        quantity: '8',
        trailAmount: '3.0',
        isPractice: true,
      }

      const createdOrder = {
        id: 'new-order-id',
        userId: 'test-user-id',
        accountId: null,
        symbol: 'MSFT',
        quantity: 8,
        trailAmount: 3.0,
        trailPercent: null,
        stopPrice: null,
        isActive: true,
        isPractice: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockedPrisma.trailStopLossOrder.create.mockResolvedValue(createdOrder)

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(orderWithoutAccount),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockedPrisma.trailStopLossOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: null,
        }),
      })
    })

    it('should return 400 for missing required fields', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        symbol: 'AAPL',
        // Missing quantity
      }

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Symbol and quantity are required' })
    })

    it('should return 400 for invalid quantity', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        symbol: 'AAPL',
        quantity: '0',
        trailAmount: '5.0',
      }

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Quantity must be greater than 0' })
    })

    it('should return 400 for invalid trail amount', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        symbol: 'AAPL',
        quantity: '10',
        trailAmount: '-5.0',
      }

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Trail amount must be greater than 0' })
    })

    it('should return 400 for invalid trail percentage', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)

      const invalidData = {
        symbol: 'AAPL',
        quantity: '10',
        trailPercent: '150', // > 100%
      }

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Trail percentage must be between 0 and 100' })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should handle database errors', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.trailStopLossOrder.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to create order' })
    })

    it('should handle malformed JSON', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost/api/trail-stop/orders', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to create order' })
    })
  })
})
