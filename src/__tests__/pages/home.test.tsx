import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter as _useRouter } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

describe('Home Page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    ;(useSession as jest.Mock).mockReset()
  })

  it('shows loading spinner when session is loading', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    expect(screen.getByText('', { selector: '.animate-spin' })).toBeInTheDocument()
  })

  it('redirects to dashboard when user is authenticated', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('renders landing page when user is not authenticated', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    // Check for key elements of the landing page
    expect(screen.getAllByText('Trading212 Extra')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Sign In')[0]).toBeInTheDocument()
  })

  it('displays all feature cards', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    expect(screen.getAllByText('AI Exit Strategies')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Trail Stop Loss')[0]).toBeInTheDocument()
    expect(screen.getAllByText('P/L Analytics')[0]).toBeInTheDocument()
    expect(screen.getByText('Mobile Ready')).toBeInTheDocument()
  })

  it('displays stats section', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    expect(screen.getByText('10K+')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('$50M+')).toBeInTheDocument()
    expect(screen.getByText('Volume Traded')).toBeInTheDocument()
    expect(screen.getByText('99.9%')).toBeInTheDocument()
    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getAllByText('24/7')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Support')[0]).toBeInTheDocument()
  })

  it('displays CTA section', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    // Check for CTA elements that exist
    expect(screen.getByText('Get Started Free')).toBeInTheDocument()
  })

  it('displays footer links', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getAllByText('Support')[0]).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
  })

  it('has proper navigation links', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Home = (await import('@/app/page')).default
    render(React.createElement(Home))

    const signInLinks = screen.getAllByText('Sign In')
    const getStartedLinks = screen.getAllByText('Get Started')
    
    expect(signInLinks.length).toBeGreaterThan(0)
    expect(getStartedLinks.length).toBeGreaterThan(0)
  })
})
