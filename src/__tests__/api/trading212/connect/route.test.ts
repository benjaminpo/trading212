import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/trading212/connect/route'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

describe('/api/trading212/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/trading212/connect', () => {
    it('should return 410 Gone for deprecated endpoint', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading212/connect', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'test-key' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data).toEqual({
        error: 'This endpoint is deprecated. Please use POST /api/trading212/accounts instead.',
        migration: {
          oldEndpoint: '/api/trading212/connect',
          newEndpoint: '/api/trading212/accounts',
          requiredFields: ['name', 'apiKey'],
          optionalFields: ['isPractice', 'isDefault']
        }
      })
    })
  })

  describe('DELETE /api/trading212/connect', () => {
    it('should return 410 Gone for deprecated endpoint', async () => {
      const request = new NextRequest('http://localhost:3000/api/trading212/connect', {
        method: 'DELETE'
      })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data).toEqual({
        error: 'This endpoint is deprecated. Please use DELETE /api/trading212/accounts/[accountId] instead.',
        migration: {
          oldEndpoint: 'DELETE /api/trading212/connect',
          newEndpoint: 'DELETE /api/trading212/accounts/[accountId]',
          note: 'Use the specific account ID to delete individual accounts'
        }
      })
    })
  })
})