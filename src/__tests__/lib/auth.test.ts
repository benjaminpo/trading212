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
    it('returns token with user id', async () => {
      const jwtCallback = authOptions.callbacks?.jwt
      expect(jwtCallback).toBeDefined()

      const result = await jwtCallback!({
        token: {},
        user: { id: '1', email: 'test@example.com' },
      })

      expect(result.id).toBe('1')
    })

    it('returns token without user id when user is not provided', async () => {
      const jwtCallback = authOptions.callbacks?.jwt
      expect(jwtCallback).toBeDefined()

      const result = await jwtCallback!({
        token: { id: '1' },
        user: undefined,
      })

      expect(result.id).toBe('1')
    })
  })

  describe('Session Callback', () => {
    it('returns session with user id', async () => {
      const sessionCallback = authOptions.callbacks?.session
      expect(sessionCallback).toBeDefined()

      const result = await sessionCallback!({
        session: { user: { id: '1', email: 'test@example.com' } },
        token: { id: '1' },
      })

      expect(result?.user?.id).toBe('1')
    })

    it('returns session without user id when token is not provided', async () => {
      const sessionCallback = authOptions.callbacks?.session
      expect(sessionCallback).toBeDefined()

      const result = await sessionCallback!({
        session: { user: { id: '1', email: 'test@example.com' } },
        token: undefined,
      })

      expect(result?.user?.id).toBe('1') // The session callback preserves the user id from the session
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
