import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import AccountSelector from '@/components/account-selector'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock useSession - this will use the global mock from jest.setup.js
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('AccountSelector', () => {
  const mockOnAccountChange = jest.fn()
  
  const mockAccounts = [
    {
      id: 'account-1',
      name: 'Personal',
      isPractice: false,
      isDefault: true,
      isActive: true,
    },
    {
      id: 'account-2', 
      name: 'Demo',
      isPractice: true,
      isDefault: false,
      isActive: true,
    },
    {
      id: 'account-3',
      name: 'Business',
      isPractice: false,
      isDefault: false,
      isActive: false, // Inactive account
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful session
    mockedUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      },
      status: 'authenticated',
    } as any)

    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    } as Response)
  })

  it('should render with "All Accounts" option when no account is selected', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('All Accounts')).toBeInTheDocument()
    })
  })

  it('should render with selected account name when account is selected', async () => {
    render(
      <AccountSelector 
        selectedAccountId="account-1"
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
  })

  it('should load and display accounts on mount', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/trading212/accounts')
    })
  })

  it('should show dropdown when clicked', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getAllByText('All Accounts')).toHaveLength(2) // Button text and dropdown option
      expect(screen.getByText('Personal')).toBeInTheDocument()
      expect(screen.getByText('Demo')).toBeInTheDocument()
      // Should not show inactive accounts
      expect(screen.queryByText('Business')).not.toBeInTheDocument()
    })
  })

  it('should display account types correctly', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Practice')).toBeInTheDocument()
      // Live accounts don't show a specific badge, just the account name
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
  })

  it('should show star icon for default account', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      // The default account should show a star icon (lucide-star class)
      const starIcon = document.querySelector('.lucide-star')
      expect(starIcon).toBeInTheDocument()
    })
  })

  it('should call onAccountChange when account is selected', async () => {
    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Personal'))

    expect(mockOnAccountChange).toHaveBeenCalledWith('account-1')
  })

  it('should call onAccountChange with null when "All Accounts" is selected', async () => {
    render(
      <AccountSelector 
        selectedAccountId="account-1"
        onAccountChange={mockOnAccountChange}
      />
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('All Accounts')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('All Accounts'))

    expect(mockOnAccountChange).toHaveBeenCalledWith(null)
  })

  it('should handle loading state', () => {
    // Mock fetch to not resolve immediately
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    // Should show loading skeleton (animate-pulse class)
    const loadingSkeleton = document.querySelector('.animate-pulse')
    expect(loadingSkeleton).toBeInTheDocument()
  })

  it('should handle error state gracefully', async () => {
    // Mock fetch to reject
    mockFetch.mockRejectedValue(new Error('Network error'))
    
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No accounts configured')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error loading accounts:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should handle empty accounts list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: [] }),
    } as Response)

    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No accounts configured')).toBeInTheDocument()
    })
  })

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No accounts configured')).toBeInTheDocument()
    })

    // Component shows no accounts configured when API fails (no error logging for failed responses)
  })

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <AccountSelector 
          selectedAccountId={undefined}
          onAccountChange={mockOnAccountChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const button = await screen.findByRole('button')
    fireEvent.click(button)

    // Dropdown should be open - check for dropdown container
    await waitFor(() => {
      const dropdown = document.querySelector('.absolute.top-full')
      expect(dropdown).toBeInTheDocument()
    })

    // Click the backdrop (fixed inset-0 z-40)
    const backdrop = document.querySelector('.fixed.inset-0.z-40')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)

    // Dropdown should close
    await waitFor(() => {
      const dropdown = document.querySelector('.absolute.top-full')
      expect(dropdown).not.toBeInTheDocument()
    })
  })

  it('should apply custom className', async () => {
    const { container } = render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
        className="custom-class"
      />
    )

    // Wait for loading to complete and component to render
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    // The className is applied to the outer div with relative class
    const outerDiv = container.querySelector('.relative')
    expect(outerDiv).toHaveClass('relative')
    expect(outerDiv).toHaveClass('custom-class')
  })

  it('should handle unauthenticated session', async () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any)

    // Mock fetch to return unauthorized
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    render(
      <AccountSelector 
        selectedAccountId={undefined}
        onAccountChange={mockOnAccountChange}
      />
    )

    // Component will still try to load accounts but get unauthorized, showing no accounts
    await waitFor(() => {
      expect(screen.getByText('No accounts configured')).toBeInTheDocument()
    })
  })
})
