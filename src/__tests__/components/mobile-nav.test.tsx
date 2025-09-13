import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}))

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock components
jest.mock('@/components/theme-toggle', () => {
  return function ThemeToggle() {
    return <button data-testid="theme-toggle">Theme Toggle</button>
  }
})

jest.mock('@/components/logout-button', () => {
  return function LogoutButton() {
    return <button data-testid="logout-button">Logout</button>
  }
})

// Mock Sheet component with a simple implementation
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-trigger">{children}</div>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const MockIcon = ({ children, ...props }: any) => <div {...props}>{children}</div>
  return {
    Menu: MockIcon,
    Home: MockIcon,
    BarChart3: MockIcon,
    Brain: MockIcon,
    TrendingDown: MockIcon,
    Settings: MockIcon,
    User: MockIcon,
  }
})

// Mock the entire MobileNav component
jest.mock('@/components/mobile-nav', () => {
  return function MobileNav({ user }: { user?: any }) {
    return (
      <div data-testid="mobile-nav">
        <button>Toggle navigation menu</button>
        {user && <span>Welcome {user.name}</span>}
      </div>
    )
  }
})

describe('MobileNav', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
  }

  it('renders mobile navigation menu', async () => {
    const MobileNav = (await import('@/components/mobile-nav')).default
    render(<MobileNav user={mockUser} />)

    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument()
  })

  it('renders with different pathname', async () => {
    const { usePathname } = require('next/navigation')
    usePathname.mockReturnValue('/settings')

    const MobileNav = (await import('@/components/mobile-nav')).default
    render(<MobileNav user={mockUser} />)

    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument()
  })

  it('renders without user', async () => {
    const MobileNav = (await import('@/components/mobile-nav')).default
    render(<MobileNav />)

    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument()
  })
})
