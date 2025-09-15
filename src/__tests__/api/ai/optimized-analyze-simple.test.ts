import { POST } from '../../../app/api/ai/optimized-analyze/route'
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
    aIAnalysisLog: {
      create: jest.fn(),
    },
  },
  retryDatabaseOperation: jest.fn(),
}))

jest.mock('@/lib/optimized-trading212', () => ({
  optimizedTrading212Service: {
    getPositions: jest.fn(),
    getPortfolio: jest.fn(),
  },
}))

jest.mock('@/lib/optimized-ai-service', () => ({
  optimizedAIService: {
    analyzePositions: jest.fn(),
    getMarketData: jest.fn(),
  },
}))

describe('Optimized AI Analyze Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle unauthorized requests', async () => {
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle missing user ID', async () => {
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue({ user: {} })

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle users with no Trading212 accounts', async () => {
    const { getServerSession } = require('next-auth')
    const { prisma, retryDatabaseOperation } = require('@/lib/prisma')

    getServerSession.mockResolvedValue({ user: { id: 'user1' } })
    retryDatabaseOperation.mockImplementation((fn) => fn())
    prisma.user.findUnique.mockResolvedValue({ trading212Accounts: [] })

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No active Trading212 accounts found')
  })

  it('should handle null user response', async () => {
    const { getServerSession } = require('next-auth')
    const { prisma, retryDatabaseOperation } = require('@/lib/prisma')

    getServerSession.mockResolvedValue({ user: { id: 'user1' } })
    retryDatabaseOperation.mockImplementation((fn) => fn())
    prisma.user.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No active Trading212 accounts found')
  })

  it('should handle users with null Trading212 accounts', async () => {
    const { getServerSession } = require('next-auth')
    const { prisma, retryDatabaseOperation } = require('@/lib/prisma')

    getServerSession.mockResolvedValue({ user: { id: 'user1' } })
    retryDatabaseOperation.mockImplementation((fn) => fn())
    prisma.user.findUnique.mockResolvedValue({ trading212Accounts: null })

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No active Trading212 accounts found')
  })

  it('should handle invalid JSON in request body', async () => {
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue({ user: { id: 'user1' } })

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
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

    const request = new NextRequest('http://localhost:3000/api/ai/optimized-analyze', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'BATCH_ANALYSIS' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
