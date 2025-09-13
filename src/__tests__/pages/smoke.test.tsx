import React from 'react'
import { render, screen as _screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next-auth and next/navigation used by pages
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test User', email: 'test@example.com' } }, status: 'authenticated' })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

beforeEach(() => {
  // Mock IntersectionObserver used by Next.js Link prefetch
  ;(global as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/trading212/accounts')) {
      return {
        ok: true,
        json: async () => ({ accounts: [] })
      } as any
    }
    if (url.includes('/api/trading212/account')) {
      return {
        ok: true,
        json: async () => ({ connected: false })
      } as any
    }
    if (url.includes('/api/ai/analyze-positions')) {
      return {
        ok: true,
        json: async () => ({ recommendations: [] })
      } as any
    }
    if (url.includes('/api/trail-stop/orders')) {
      return {
        ok: true,
        json: async () => ({ orders: [] })
      } as any
    }
    if (url.includes('/api/trading212/portfolio')) {
      return {
        ok: true,
        json: async () => ({ positions: [], connected: false, totalValue: 0, totalPnL: 0, totalPnLPercent: 0 })
      } as any
    }
    return { ok: true, json: async () => ({}) } as any
  }) as any
})

afterEach(() => {
  jest.resetAllMocks()
})

// Lazy import pages to avoid module evaluation during mock setup
describe('App pages smoke tests', () => {
  it('renders Dashboard without crashing', async () => {
    const Dashboard = (await import('@/app/dashboard/page')).default
    render(React.createElement(Dashboard))
    expect(document.body).toBeInTheDocument()
  })

  it('renders Trail Stop page without crashing', async () => {
    const TrailStopPage = (await import('@/app/trail-stop/page')).default
    render(React.createElement(TrailStopPage))
    // Should at least render the wrapper container
    expect(document.body).toBeInTheDocument()
  })

  it('renders AI Recommendations page without crashing', async () => {
    const AIRecommendationsPage = (await import('@/app/ai-recommendations/page')).default
    render(React.createElement(AIRecommendationsPage))
    expect(document.body).toBeInTheDocument()
  })
})


