import { PUT } from '../../../../../../../app/api/trading212/optimized/accounts/[accountId]/set-default/route'
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
    trading212Account: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}))

describe('Trading212 Account Set Default Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT /api/trading212/optimized/accounts/[accountId]/set-default', () => {
    it('should handle unauthorized requests', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle account not found', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })

    it('should set account as default successfully', async () => {
      const { getServerSession } = require('next-auth')
      const { prisma: _prisma, retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      
      const mockAccount = { 
        id: 'acc1', 
        name: 'Test Account', 
        userId: 'user1', 
        isDefault: false,
        isActive: true 
      }
      const mockUpdatedAccount = { 
        id: 'acc1',
        name: 'Test Account',
        isPractice: false,
        isDefault: true,
        isActive: true
      }
      
      retryDatabaseOperation
        .mockResolvedValueOnce(mockAccount) // First call for finding account
        .mockResolvedValueOnce({ count: 2 }) // Second call for updateMany (remove default from others)
        .mockResolvedValueOnce(mockUpdatedAccount) // Third call for update (set as default)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Default account updated successfully')
      expect(data.account).toEqual(mockUpdatedAccount)
    })

    it('should handle database errors during account lookup', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to set default account')
    })

    it('should handle database errors during updateMany', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      
      const mockAccount = { 
        id: 'acc1', 
        name: 'Test Account', 
        userId: 'user1', 
        isDefault: false,
        isActive: true 
      }
      
      retryDatabaseOperation
        .mockResolvedValueOnce(mockAccount) // First call for finding account
        .mockRejectedValueOnce(new Error('Database error')) // Second call for updateMany fails

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to set default account')
    })

    it('should handle database errors during update', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      
      const mockAccount = { 
        id: 'acc1', 
        name: 'Test Account', 
        userId: 'user1', 
        isDefault: false,
        isActive: true 
      }
      
      retryDatabaseOperation
        .mockResolvedValueOnce(mockAccount) // First call for finding account
        .mockResolvedValueOnce({ count: 2 }) // Second call for updateMany succeeds
        .mockRejectedValueOnce(new Error('Database error')) // Third call for update fails

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to set default account')
    })

    it('should handle account that is not active', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue(null) // Account not found (not active)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })

    it('should handle account belonging to different user', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')
      
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockResolvedValue(null) // Account not found (different user)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts/acc1/set-default', {
        method: 'PUT'
      })
      
      const response = await PUT(request, { params: Promise.resolve({ accountId: 'acc1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })
  })
})
