import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test User', email: 'test@example.com' } }, status: 'authenticated' })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

beforeEach(() => {
  ;(global as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/trading212/portfolio')) {
      return { ok: true, json: async () => ({ positions: [], connected: false, totalValue: 0, totalPnL: 0, totalPnLPercent: 0, account: { cash: 0, currency: 'USD' } }) } as any
    }
    if (url.includes('/api/trading212/accounts')) {
      return { ok: true, json: async () => ({ accounts: [] }) } as any
    }
    if (url.includes('/api/trading212/account')) {
      return { ok: true, json: async () => ({ connected: false }) } as any
    }
    return { ok: true, json: async () => ({}) } as any
  }) as any
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Analytics and Home pages smoke', () => {
  it('renders Analytics page without crashing', async () => {
    const AnalyticsPage = (await import('@/app/analytics/page')).default
    render(React.createElement(AnalyticsPage))
    expect(document.body).toBeInTheDocument()
  })

  it('renders Home page without crashing', async () => {
    const HomePage = (await import('@/app/page')).default
    render(React.createElement(HomePage))
    expect(document.body).toBeInTheDocument()
  })
})
