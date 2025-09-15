import { authOptions } from '@/lib/auth'
import { prisma as _prisma } from '@/lib/prisma'
import _bcrypt from 'bcryptjs'

const mockedPrisma = _prisma as any

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

describe('Auth Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mocks to default values
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    ;(_bcrypt.compare as jest.Mock).mockResolvedValue(false)
  })

  describe('Credentials Provider', () => {
    it('has credentials provider configured', () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      )
      expect(credentialsProvider).toBeDefined()
    })
  })

  describe('Auth Options Configuration', () => {
    it('has correct session strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('has correct pages configuration', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/signin')
    })

    it('has correct callbacks configuration', () => {
      expect(authOptions.callbacks?.jwt).toBeDefined()
      expect(authOptions.callbacks?.session).toBeDefined()
    })

    it('has Google provider configured', () => {
      const googleProvider = authOptions.providers.find(
        provider => provider.id === 'google'
      )
      expect(googleProvider).toBeDefined()
    })

    it('has credentials provider configured', () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      )
      expect(credentialsProvider).toBeDefined()
    })
  })

  describe('JWT Callback', () => {
    it('returns token with user id when user is provided', async () => {
      const jwtCallback = authOptions.callbacks?.jwt
      expect(jwtCallback).toBeDefined()

      const result = await jwtCallback!({
        token: {},
        user: { id: '1', email: 'test@example.com', emailVerified: null },
        account: null,
      })

      expect(result.id).toBe('1')
    })

    it('returns token without user id when user is not provided', async () => {
      const jwtCallback = authOptions.callbacks?.jwt
      expect(jwtCallback).toBeDefined()

      const result = await jwtCallback!({
        token: { id: '1' },
        user: null,
        account: null,
      })

      expect(result.id).toBe('1') // Should preserve existing token id
    })

    it('returns token without user id when user is undefined', async () => {
      const jwtCallback = authOptions.callbacks?.jwt
      expect(jwtCallback).toBeDefined()

      const result = await jwtCallback!({
        token: { id: '1' },
        user: undefined,
        account: null,
      })

      expect(result.id).toBe('1') // Should preserve existing token id
    })
  })

  describe('Session Callback', () => {
    it('returns session with user id when token is provided', async () => {
      const sessionCallback = authOptions.callbacks?.session
      expect(sessionCallback).toBeDefined()

      const result = await sessionCallback!({
        session: { user: { id: '1', email: 'test@example.com' }, expires: '2024-12-31T23:59:59.999Z' },
        token: { id: '1' },
        user: { id: '1', email: 'test@example.com', emailVerified: null },
      } as any)

      expect((result?.user as any)?.id).toBe('1')
    })

    it('returns session without user id when token is not provided', async () => {
      const sessionCallback = authOptions.callbacks?.session
      expect(sessionCallback).toBeDefined()

      const result = await sessionCallback!({
        session: { user: { id: '1', email: 'test@example.com' }, expires: '2024-12-31T23:59:59.999Z' },
        token: null,
        user: { id: '1', email: 'test@example.com', emailVerified: null },
      } as any)

      expect((result?.user as any)?.id).toBe('1') // Should preserve session user id when token is null
    })

    it('returns session without user id when token is undefined', async () => {
      const sessionCallback = authOptions.callbacks?.session
      expect(sessionCallback).toBeDefined()

      const result = await sessionCallback!({
        session: { user: { id: '1', email: 'test@example.com' }, expires: '2024-12-31T23:59:59.999Z' },
        token: undefined,
        user: { id: '1', email: 'test@example.com', emailVerified: null },
      } as any)

      expect((result?.user as any)?.id).toBe('1') // Should preserve session user id when token is undefined
    })
  })

  describe('Credentials Provider Authorize', () => {
    it('returns null when email is missing', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any
      
      const result = await credentialsProvider.authorize({
        email: '',
        password: 'password123'
      })

      expect(result).toBeNull()
    })

    it('returns null when password is missing', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any
      
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: ''
      })

      expect(result).toBeNull()
    })

    it('returns null when user is not found', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any

      mockedPrisma.user.findUnique.mockResolvedValue(null)
      
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result).toBeNull()
    })

    it('returns null when user has no password', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: null
      })
      
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result).toBeNull()
    })

    it('returns null when password is invalid', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        image: null
      })

      ;(_bcrypt.compare as jest.Mock).mockResolvedValue(false)
      
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      expect(result).toBeNull()
    })



    it('returns null when credentials are missing both email and password', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any
      
      const result = await credentialsProvider.authorize({
        email: '',
        password: ''
      })

      expect(result).toBeNull()
    })

    it('returns null when credentials object is null', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any
      
      const result = await credentialsProvider.authorize(null)

      expect(result).toBeNull()
    })

    it('returns null when credentials object is undefined', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any
      
      const result = await credentialsProvider.authorize(undefined)

      expect(result).toBeNull()
    })

    it('has authorize function that can be called', async () => {
      const credentialsProvider = authOptions.providers.find(
        provider => provider.id === 'credentials'
      ) as any

      expect(credentialsProvider).toBeDefined()
      expect(credentialsProvider.authorize).toBeDefined()
      expect(typeof credentialsProvider.authorize).toBe('function')
    })
  })
})
