import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/trading212/accounts/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    trading212Account: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn()
    }
  },
  retryDatabaseOperation: jest.fn((operation) => operation()),
}))

jest.mock('@/lib/trading212')

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const mockedTrading212API = Trading212API as jest.MockedClass<typeof Trading212API>

describe('/api/trading212/accounts', () => {
  const mockAccounts = [
    {
      id: 'account-1',
      name: 'Main Account',
      apiKey: 'test-api-key-1',
      isPractice: false,
      isActive: true,
      isDefault: true,
      accountId: 'acc-123',
      currency: 'USD',
      cash: 10000,
      lastConnected: new Date('2024-01-01T00:00:00.000Z'),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z')
    },
    {
      id: 'account-2',
      name: 'Demo Account',
      apiKey: 'test-api-key-2',
      isPractice: true,
      isActive: true,
      isDefault: false,
      accountId: 'acc-456',
      currency: 'USD',
      cash: 50000,
      lastConnected: new Date('2024-01-02T00:00:00.000Z'),
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z')
    }
  ]

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    trading212Accounts: mockAccounts
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Trading212API
    const mockAPI = {
      getAccount: jest.fn(),
      validateConnection: jest.fn()
    }
    mockedTrading212API.mockImplementation(() => mockAPI as any)
  })

  describe('GET /api/trading212/accounts', () => {
    it('should return user accounts for authenticated user', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockedPrisma.trading212Account.findMany.mockResolvedValue(mockAccounts as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts).toHaveLength(2)
      expect(data.accounts[0].name).toBe('Main Account')
      expect(data.accounts[1].name).toBe('Demo Account')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for user not found', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should handle database errors', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch accounts')
    })
  })

  describe('POST /api/trading212/accounts', () => {
  const validAccountData = {
    name: 'New Account',
    apiKey: 'new-api-key-that-is-long-enough-for-validation-that-is-long-enough-for-validation',
    isPractice: false
  }

    it('should create new Trading212 account', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('new-api-key-that-is-long-enough-for-validation', false)
      mockAPI.validateConnection = jest.fn().mockResolvedValue(true)
      mockAPI.getAccount = jest.fn().mockResolvedValue({
        id: 'new-acc-123',
        cash: 15000,
        currencyCode: 'USD'
      })

      const newAccount = {
        ...mockAccounts[0],
        id: 'new-account-id',
        name: 'New Account',
        apiKey: 'new-api-key-that-is-long-enough-for-validation'
      }

      mockedPrisma.trading212Account.create.mockResolvedValue(newAccount as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Account added successfully')
      expect(data.account.name).toBe('New Account')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockedGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing required fields', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      const invalidData = {
        name: 'New Account'
        // Missing apiKey
      }

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Account name and API key are required')
    })

    it('should return 400 for invalid API key', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('invalid-api-key', false)
      mockAPI.validateConnection = jest.fn().mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Account',
          apiKey: 'invalid-api-key',
          isPractice: false
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('API key appears to be too short. Please check your key.')
    })

    it('should handle API connection errors', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('new-api-key-that-is-long-enough-for-validation', false)
      mockAPI.validateConnection = jest.fn().mockRejectedValue(new Error('Network error'))

      mockedPrisma.trading212Account.create.mockResolvedValue({
        id: 'new-account-id',
        name: 'New Account',
        isPractice: false,
        isActive: true,
        isDefault: false,
        currency: null,
        cash: null,
        lastConnected: null,
        lastError: 'Network error',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Account added but connection failed: Network error')
    })

    it('should handle database creation errors', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('new-api-key-that-is-long-enough-for-validation', false)
      mockAPI.validateConnection = jest.fn().mockResolvedValue(true)
      mockAPI.getAccount = jest.fn().mockResolvedValue({
        id: 'new-acc-123',
        cash: 15000,
        currencyCode: 'USD'
      })

      mockedPrisma.trading212Account.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to add account')
    })

    it('should handle duplicate account names', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const mockAPI = new mockedTrading212API('new-api-key-that-is-long-enough-for-validation', false)
      mockAPI.validateConnection = jest.fn().mockResolvedValue(true)
      mockAPI.getAccount = jest.fn().mockResolvedValue({
        id: 'new-acc-123',
        cash: 15000,
        currencyCode: 'USD'
      })

      mockedPrisma.trading212Account.create.mockRejectedValue(
        new Error('Unique constraint failed on field: name')
      )

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to add account')
    })

    it('should validate both production and demo modes', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: mockUser
      } as any)

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      // Mock successful demo API connection
      const mockAPI = new mockedTrading212API('demo-api-key-that-is-long-enough-for-validation-and-testing-purposes', true)
      mockAPI.validateConnection = jest.fn().mockResolvedValue(true)
      mockAPI.getAccount = jest.fn().mockResolvedValue({
        id: 'demo-acc-123',
        cash: 100000,
        currencyCode: 'USD'
      })

      const newAccount = {
        ...mockAccounts[0],
        id: 'new-account-id',
        name: 'Test Demo Account',
        apiKey: 'demo-api-key-that-is-long-enough-for-validation-and-testing-purposes',
        isPractice: true
      }

      mockedPrisma.trading212Account.create.mockResolvedValue(newAccount as any)

      const request = new NextRequest('http://localhost:3000/api/trading212/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Demo Account',
          apiKey: 'demo-api-key-that-is-long-enough-for-validation-and-testing-purposes',
          isPractice: true // Explicitly set to true
        })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.account.isPractice).toBe(true)
    })
  })
})
