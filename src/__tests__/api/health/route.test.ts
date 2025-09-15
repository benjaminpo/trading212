// import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
  retryDatabaseOperation: jest.fn((operation) => operation()),
  checkDatabaseConnection: jest.fn(),
}))

describe('/api/health', () => {
  const { checkDatabaseConnection } = require('@/lib/prisma')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns healthy status when database is connected', async () => {
    checkDatabaseConnection.mockResolvedValue(true)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.services.database).toBe(true)
    expect(data.errors).toEqual([])
    expect(data.timestamp).toBeDefined()
  })

  it('returns unhealthy status when database is not connected', async () => {
    checkDatabaseConnection.mockResolvedValue(false)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.services.database).toBe(false)
    expect(data.errors).toContain('Database connection failed')
    expect(data.timestamp).toBeDefined()
  })

  it('returns unhealthy status when database query fails', async () => {
    checkDatabaseConnection.mockRejectedValue(new Error('Query timeout'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.services.database).toBe(false)
    expect(data.errors).toContain('Health check failed')
  })

  it('includes timestamp in response', async () => {
    checkDatabaseConnection.mockResolvedValue(true)

    const response = await GET()
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })

  it('handles unexpected database errors', async () => {
    checkDatabaseConnection.mockRejectedValue(new Error('Unexpected error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.services.database).toBe(false)
    expect(data.errors).toContain('Health check failed')
  })
})
