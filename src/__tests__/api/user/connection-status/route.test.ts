import { GET } from '@/app/api/user/connection-status/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  },
  retryDatabaseOperation: jest.fn((operation) => operation()),
}))

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedPrisma = prisma as jest.Mocked<typeof prisma>

const mockSession = {
  user: { id: 'test-user-id' }
}

describe('/api/user/connection-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/user/connection-status', () => {
    it('should return connection status for authenticated user with connected Trading212', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.user.findUnique.mockResolvedValue({
        trading212Accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            isPractice: false,
            isDefault: true
          }
        ]
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        hasApiKey: true,
        accounts: [
          {
            id: 'account-1',
            name: 'Test Account',
            isPractice: false,
            isDefault: true
          }
        ]
      })
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: {
          trading212Accounts: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              isPractice: true,
              isDefault: true
            }
          }
        }
      })
    })

    it('should return false for user without Trading212 connection', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.user.findUnique.mockResolvedValue({
        trading212Accounts: []
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        hasApiKey: false,
        accounts: []
      })
    })

    it('should return false for user with API key but not connected', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.user.findUnique.mockResolvedValue({
        trading212Accounts: []
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        hasApiKey: false,
        accounts: []
      })
    })

    it('should handle user not found', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.user.findUnique.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        hasApiKey: false,
        accounts: []
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should handle database errors', async () => {
      mockedGetServerSession.mockResolvedValue(mockSession as any)
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch connection status' })
    })
  })
})