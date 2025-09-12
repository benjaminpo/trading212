import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/settings',
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Mock fetch
global.fetch = jest.fn()

// Mock window.alert and window.confirm
global.alert = jest.fn()
global.confirm = jest.fn(() => true)

describe('Settings Page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    ;(useSession as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockReset()
    ;(global.alert as jest.Mock).mockReset()
    ;(global.confirm as jest.Mock).mockReset()
    
    // Default mock for authenticated user
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
  })

  it('redirects unauthenticated users to signin', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/auth/signin')
    })
  })

  it('shows loading state initially', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    // Mock fetch to return pending promise
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    expect(screen.getByText('', { selector: '.animate-spin' })).toBeInTheDocument()
  })

  it('loads and displays accounts', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: true,
        currency: 'USD',
        cash: 1000,
        lastConnected: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })
  })

  it('shows add account form when add button is clicked', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: [] }),
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(screen.getByText('Trading212 Accounts')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Account')
    fireEvent.click(addButton)

    expect(screen.getByText('Add New Trading212 Account')).toBeInTheDocument()
    expect(screen.getByText('Account Name')).toBeInTheDocument()
    expect(screen.getByText('Trading212 API Key')).toBeInTheDocument()
  })

  it('submits new account form', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: [] }),
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(screen.getByText('Trading212 Accounts')).toBeInTheDocument()
    })

    // Open add form
    const addButton = screen.getByText('Add Account')
    fireEvent.click(addButton)

    // Fill form
    const nameInput = screen.getByPlaceholderText('e.g., Personal, Business, Demo')
    const apiKeyInput = screen.getByPlaceholderText('Enter your Trading212 API key')
    const submitButton = screen.getAllByText('Add Account').find(button => 
      button.getAttribute('type') === 'submit'
    )

    fireEvent.change(nameInput, { target: { value: 'New Account' } })
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } })

    // Mock successful response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trading212/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Account',
          apiKey: 'test-api-key',
          isPractice: false,
          isDefault: false,
        }),
      })
    })
  })

  it('handles account deletion', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account',
        isPractice: false,
        isActive: true,
        isDefault: true,
        currency: 'USD',
        cash: 1000,
        lastConnected: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    // Wait for the account to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })

    // Verify delete button exists
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('displays account status indicators', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    const mockAccounts = [
      {
        id: '1',
        name: 'Live Account',
        isPractice: false,
        isActive: true,
        isDefault: true,
        currency: 'USD',
        cash: 1000,
        lastConnected: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Demo Account',
        isPractice: true,
        isActive: false,
        isDefault: false,
        currency: 'USD',
        cash: 10000,
        lastConnected: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    })

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(screen.getByText('Live Account')).toBeInTheDocument()
      expect(screen.getByText('Demo Account')).toBeInTheDocument()
    })

    // Check for status indicators
    expect(screen.getAllByText('Connected')[0]).toBeInTheDocument()
    expect(screen.getByText('Practice')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })

    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    const Settings = (await import('@/app/settings/page')).default
    render(React.createElement(Settings))

    await waitFor(() => {
      expect(screen.getByText('Trading212 Accounts')).toBeInTheDocument()
    })

    // Should still render the page even with API errors
    expect(screen.getByText('Add Account')).toBeInTheDocument()
  })
})
