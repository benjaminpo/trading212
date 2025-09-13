import { NextRequest } from 'next/server'
import { POST } from '@/app/api/trading212/accounts/[accountId]/set-default/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    trading212Account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('/api/trading212/accounts/[accountId]/set-default', () => {
  const mockPrisma = {
    trading212Account: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the mock implementation
    const { prisma } = require('@/lib/prisma')
    Object.assign(prisma.trading212Account, mockPrisma.trading212Account)
    
    // Mock authentication
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' }
    })
  })

  describe('POST', () => {
    it('sets account as default successfully', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 2 })
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true,
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Default account updated successfully')
    })

    it('returns 404 when account not found', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/999/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '999' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles database errors during findUnique', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to set default account')
    })

    it('handles database errors during updateMany', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to set default account')
    })

    it('handles database errors during update', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 2 })
      prisma.trading212Account.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to set default account')
    })

    it('handles unauthorized access', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('handles account belonging to different user', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles successful update with no existing default accounts', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true,
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Default account updated successfully')
    })

    it('handles successful update with multiple existing default accounts', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 3 })
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true,
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Default account updated successfully')
    })

    it('handles inactive account cannot be set as default', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: false,
        isDefault: false,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@example.com' })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Cannot set inactive account as default')
    })

    it('handles user not found', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1/set-default', {
        method: 'POST',
      })

      const response = await POST(request, { params: { accountId: '1' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })
})
