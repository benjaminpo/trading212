import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/optimization/route'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

// Mock optimization services
jest.mock('@/lib/optimized-trading212', () => ({
  optimizedTrading212Service: {
    getCacheStats: jest.fn().mockReturnValue({ totalEntries: 5, memoryUsage: 10240 }),
    getBatchStats: jest.fn().mockReturnValue({ pendingBatches: 1, totalPendingRequests: 3 })
  }
}))

jest.mock('@/lib/optimized-ai-service', () => ({
  optimizedAIService: {
    getStats: jest.fn().mockReturnValue({ totalAnalyses: 10, cacheHits: 7, cacheMisses: 3 })
  }
}))

jest.mock('@/lib/background-sync', () => ({
  backgroundSyncService: {
    healthCheck: jest.fn().mockReturnValue({ isRunning: true, lastSync: new Date().toISOString() }),
    isServiceRunning: jest.fn().mockReturnValue(true)
  }
}))

describe('/api/health/optimization', () => {
  const mockSession = {
    user: {
      id: 'user123'
    }
  }

  beforeEach(() => {
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET', () => {
    it('should return health data for authenticated user', async () => {
      const request = new NextRequest('http://localhost/api/health/optimization')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('services')
      expect(data).toHaveProperty('optimization')
      expect(data.services).toHaveProperty('apiCache')
      expect(data.services).toHaveProperty('apiBatcher')
      expect(data.services).toHaveProperty('aiService')
      expect(data.services).toHaveProperty('backgroundSync')
    })

    it('should return detailed health data when requested', async () => {
      const request = new NextRequest('http://localhost/api/health/optimization?detailed=true')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('services')
      expect(data).toHaveProperty('optimization')
    })

    it('should return 401 for unauthenticated user', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/health/optimization')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error', 'Unauthorized')
    })

    it('should handle service errors gracefully', async () => {
      const { optimizedTrading212Service } = require('@/lib/optimized-trading212')
      optimizedTrading212Service.getCacheStats.mockImplementation(() => {
        throw new Error('Service error')
      })

      const request = new NextRequest('http://localhost/api/health/optimization')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
    })
  })
})
