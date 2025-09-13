import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('bcryptjs')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockedPrisma = prisma as any

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    it('should create a new user successfully', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null)
      ;(mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_123')
      
      const createdUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password_123',
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
      }
      
      mockedPrisma.user.create.mockResolvedValue(createdUser)

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validUserData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'User created successfully',
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
        }
      })

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12)
      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'hashed_password_123',
        }
      })
    })

    it('should return 400 for missing name', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Name, email, and password are required'
      })
    })

    it('should return 400 for missing email', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Name, email, and password are required'
      })
    })

    it('should return 400 for missing password', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Name, email, and password are required'
      })
    })

    it('should return 400 for existing user', async () => {
      const existingUser = {
        id: 'existing-user-123',
        email: 'john@example.com',
        name: 'John Doe',
      }
      
      mockedPrisma.user.findUnique.mockResolvedValue(existingUser as any)

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validUserData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'User with this email already exists'
      })
    })

    it('should handle database errors', async () => {
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validUserData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error'
      })
    })

    it('should handle bcrypt errors', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null)
      ;(mockedBcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'))

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validUserData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error'
      })
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error'
      })
    })
  })
})
