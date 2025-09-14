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
      const response = await GET(request, { params: Promise.resolve({ accountId: '1' }) })

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
      const response = await GET(request, { params: Promise.resolve({ accountId: '999' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1')
      const response = await GET(request, { params: Promise.resolve({ accountId: '1' }) })

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

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

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

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

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

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update account')
    })

    it('handles invalid JSON in request body', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update account')
    })

    it('handles empty request body', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: '',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update account')
    })

    it('handles setting account as default when no other accounts exist', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockResolvedValue({ ...mockAccount, isDefault: true })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Account updated successfully')
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

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

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

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete account')
    })

    it('handles deletion of non-existent account', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: []
      })
      prisma.trading212Account.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/nonexistent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: 'nonexistent' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles deletion of account belonging to different user', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: []
      })
      prisma.trading212Account.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/other-user-account', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: 'other-user-account' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Account not found')
    })

    it('handles successful deletion with multiple accounts', async () => {
      const { prisma } = require('@/lib/prisma')
      const multipleAccounts = [
        { id: '1', name: 'Account 1', userId: 'user1' },
        { id: '2', name: 'Account 2', userId: 'user1' }
      ]
      
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: multipleAccounts
      })
      prisma.trading212Account.findFirst.mockResolvedValue(multipleAccounts[0])
      prisma.trading212Account.delete.mockResolvedValue(multipleAccounts[0])

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Account deleted successfully')
    })

    it('handles update with partial data', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        name: 'Updated Account'
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Account' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account.name).toBe('Updated Account')
    })

    it('handles update with isDefault true', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 1 })
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isDefault: true
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account.isDefault).toBe(true)
    })

    it('handles update with isDefault false', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isDefault: false
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isDefault: false }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account.isDefault).toBe(false)
    })

    it('handles update with isActive true', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isActive: true
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account.isActive).toBe(true)
    })

    it('handles update with isActive false', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        isActive: false
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isActive: false }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.account.isActive).toBe(false)
    })

    it('handles name conflict when updating account', async () => {
      const existingAccount = {
        id: '2',
        name: 'Existing Account',
        userId: 'user1',
        isPractice: false,
        isActive: true,
        isDefault: false,
      }

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount, existingAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Existing Account' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Account name already exists. Please choose a different name.')
    })

    it('handles API key validation - too short', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'short' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('API key appears to be too short. Please check your key.')
    })

    it('handles API key validation - connection test failure', async () => {
      // Mock Trading212API
      jest.doMock('@/lib/trading212', () => ({
        Trading212API: jest.fn().mockImplementation(() => ({
          validateConnection: jest.fn().mockResolvedValue(false),
        }))
      }))

      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockResolvedValue({
        ...mockAccount,
        apiKey: 'valid-api-key-with-sufficient-length',
        lastError: 'Invalid API key or connection failed'
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'valid-api-key-with-sufficient-length' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('connection failed')
    })

    it('handles setting default account when current account is not default', async () => {
      const nonDefaultAccount = { ...mockAccount, isDefault: false }
      const { prisma } = require('@/lib/prisma')
      
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [nonDefaultAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(nonDefaultAccount)
      prisma.trading212Account.updateMany.mockResolvedValue({ count: 0 })
      prisma.trading212Account.update.mockResolvedValue({
        ...nonDefaultAccount,
        isDefault: true
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      expect(prisma.trading212Account.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', isDefault: true },
        data: { isDefault: false }
      })
    })

    it('handles deletion of default account with multiple accounts remaining', async () => {
      const multipleAccounts = [
        { id: '1', name: 'Default Account', userId: 'user1', isDefault: true },
        { id: '2', name: 'Account 2', userId: 'user1', isDefault: false },
        { id: '3', name: 'Account 3', userId: 'user1', isDefault: false }
      ]
      
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: multipleAccounts
      })
      prisma.trading212Account.findFirst.mockResolvedValue(multipleAccounts[0])
      prisma.trading212Account.delete.mockResolvedValue(multipleAccounts[0])
      prisma.trading212Account.update.mockResolvedValue({
        ...multipleAccounts[1],
        isDefault: true
      })

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      expect(prisma.trading212Account.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { isDefault: true }
      })
    })

    it('handles deletion of default account with no remaining accounts', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue({ 
        id: 'user1', 
        email: 'test@example.com',
        trading212Accounts: [mockAccount]
      })
      prisma.trading212Account.findFirst.mockResolvedValue(mockAccount)
      prisma.trading212Account.delete.mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(200)
      expect(prisma.trading212Account.update).not.toHaveBeenCalled()
    })

    it('handles user not found in DELETE method', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ accountId: '1' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })
})
