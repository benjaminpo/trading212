import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/notifications/[notificationId]/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('/api/notifications/[notificationId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' }
    })
  })

  describe('GET', () => {
    it('returns notification when found', async () => {
      const mockNotification = {
        id: '1',
        userId: 'user1',
        type: 'trail_stop_triggered',
        title: 'Test Notification',
        message: 'Test message',
        isRead: false,
        createdAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.notification.findUnique.mockResolvedValue(mockNotification)

      const request = new NextRequest('http://localhost:3000/api/notifications/1')
      const response = await GET(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        ...mockNotification,
        createdAt: mockNotification.createdAt.toISOString(),
      })
    })

    it('returns 404 when notification not found', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.notification.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/999')
      const response = await GET(request, { params: { notificationId: '999' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Notification not found')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.notification.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/notifications/1')
      const response = await GET(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch notification')
    })
  })

  describe('PUT', () => {
    const mockNotification = {
      id: '1',
      userId: 'user1',
      type: 'trail_stop_triggered',
      title: 'Test Notification',
      message: 'Test message',
      isRead: false,
      createdAt: new Date(),
    }

    it('updates notification successfully', async () => {
      const mockUpdatedNotification = {
        id: '1',
        userId: 'user1',
        type: 'trail_stop_triggered',
        title: 'Updated Notification',
        message: 'Updated message',
        isRead: true,
        createdAt: new Date(),
      }

      const { prisma } = require('@/lib/prisma')
      prisma.notification.findFirst.mockResolvedValue(mockNotification)
      prisma.notification.update.mockResolvedValue(mockUpdatedNotification)

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'PUT',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        message: 'Notification updated successfully',
        notification: {
          ...mockUpdatedNotification,
          createdAt: mockUpdatedNotification.createdAt.toISOString(),
        },
      })
    })

    it('handles invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update notification')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.notification.findFirst.mockResolvedValue(mockNotification)
      prisma.notification.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'PUT',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update notification')
    })
  })

  describe('DELETE', () => {
    const mockNotification = {
      id: '1',
      userId: 'user1',
      type: 'trail_stop_triggered',
      title: 'Test Notification',
      message: 'Test message',
      isRead: false,
      createdAt: new Date(),
    }

    it('deletes notification successfully', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.notification.findFirst.mockResolvedValue(mockNotification)
      prisma.notification.delete.mockResolvedValue({ id: '1' })

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Notification deleted successfully')
    })

    it('handles database errors', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.notification.findFirst.mockResolvedValue(mockNotification)
      prisma.notification.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { notificationId: '1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to delete notification')
    })
  })
})
