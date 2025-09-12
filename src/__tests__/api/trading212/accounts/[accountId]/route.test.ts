import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/trading212/accounts/[accountId]/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    trading212Account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('/api/trading212/accounts/[accountId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' }
    })
  })

  describe('GET', () => {
    it('returns account when found', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: true,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1')
      const response = await GET(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account).toEqual({
        id: mockAccount.id,
        name: mockAccount.name,
        isPractice: mockAccount.isPractice,
        isActive: mockAccount.isActive,
        isDefault: mockAccount.isDefault,
        currency: mockAccount.currency,
        cash: mockAccount.cash,
        createdAt: mockAccount.createdAt.toISOString(),
        lastConnected: mockAccount.lastConnected.toISOString(),
        updatedAt: mockAccount.updatedAt.toISOString(),
        apiKeyPreview: null,
      })
    })

    it('returns 404 when account not found', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: true,
        currency: 'USD',
        cash: 1000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/999')
      const response = await GET(request, { params: { accountId: '999' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1')
      const response = await GET(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch account')
    })
  })

  describe('PUT', () => {
    const mockAccount = {
      id: '1',
      userId: 'user1',
      name: 'Test Account',
      isPractice: false,
      isActive: true,
      isDefault: true,
      currency: 'USD',
      cash: 1000,
      lastConnected: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('updates account successfully', async () => {
      const mockUpdatedAccount = {
        id: '1',
        userId: 'user1',
        name: 'Updated Account',
        isPractice: true,
        isActive: false,
        isDefault: false,
        currency: 'EUR',
        cash: 2000,
        lastConnected: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockResolvedValue(mockUpdatedAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Account', isPractice: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account).toEqual({
        id: mockUpdatedAccount.id,
        name: mockUpdatedAccount.name,
        isPractice: mockUpdatedAccount.isPractice,
        isActive: mockUpdatedAccount.isActive,
        isDefault: mockUpdatedAccount.isDefault,
        currency: mockUpdatedAccount.currency,
        cash: mockUpdatedAccount.cash,
        createdAt: mockUpdatedAccount.createdAt.toISOString(),
        lastConnected: mockUpdatedAccount.lastConnected.toISOString(),
        updatedAt: mockUpdatedAccount.updatedAt.toISOString(),
        apiKeyPreview: null,
      })
    })

    it('handles invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update account')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Account' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update account')
    })
  })

  describe('DELETE', () => {
    const mockAccount = {
      id: '1',
      userId: 'user1',
      name: 'Test Account',
      isPractice: false,
      isActive: true,
      isDefault: true,
      currency: 'USD',
      cash: 1000,
      lastConnected: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('deletes account successfully', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.delete.mockResolvedValue({ id: '1' })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { accountId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Account deleted successfully')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { accountId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete account')
    })
  })
})
