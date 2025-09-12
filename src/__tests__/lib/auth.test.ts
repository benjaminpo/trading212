import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
        session: { user: { email: 'test@example.com' } },
        token: { id: '1' },
      })

      expect(result.user.id).toBe('1')
    })
  })
})
