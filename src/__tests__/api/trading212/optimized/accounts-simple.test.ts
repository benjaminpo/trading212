import { GET, POST } from '../../../../app/api/trading212/optimized/accounts/route'
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
    trading212Account: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}))

jest.mock('@/lib/optimized-trading212', () => ({
  optimizedTrading212Service: {
    getAccounts: jest.fn(),
  },
}))

describe('Optimized Trading212 Accounts Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/trading212/optimized/accounts', () => {
    it('should handle unauthorized requests', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle missing user ID', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue({ user: {} })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')

      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts')

      const response = await GET(request)
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/trading212/optimized/accounts', () => {
    it('should handle unauthorized requests', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Account',
          apiKey: 'test-key',
          isPractice: false
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle missing user ID', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue({ user: {} })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Account',
          apiKey: 'test-key',
          isPractice: false
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle missing required fields', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Account',
          // Missing apiKey
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name and API key are required')
    })

    it('should handle invalid JSON in request body', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue({ user: { id: 'user1' } })

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should handle database errors', async () => {
      const { getServerSession } = require('next-auth')
      const { retryDatabaseOperation } = require('@/lib/prisma')

      getServerSession.mockResolvedValue({ user: { id: 'user1' } })
      retryDatabaseOperation.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/optimized/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Account',
          apiKey: 'test-key',
          isPractice: false
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
})
