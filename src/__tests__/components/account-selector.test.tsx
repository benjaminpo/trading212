import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountSelector from '@/components/account-selector'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Mock fetch
global.fetch = jest.fn()

describe('AccountSelector', () => {
  const mockAccounts = [
    {
      id: '1',
      name: 'Live Account',
      isPractice: false,
      isActive: true,
      isDefault: true,
    },
    {
      id: '2',
      name: 'Demo Account',
      isPractice: true,
      isActive: false,
      isDefault: false,
    },
    {
      id: '3',
      name: 'Test Account',
      isPractice: false,
      isActive: true,
      isDefault: false,
    },
  ]

  const defaultProps = {
    selectedAccountId: '1',
    onAccountChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    })
  })

  it('renders account selector with loading state initially', () => {
    render(<AccountSelector {...defaultProps} />)

    expect(screen.getByText('', { selector: '.animate-pulse' })).toBeInTheDocument()
  })

  it('opens dropdown when clicked', async () => {
    render(<AccountSelector {...defaultProps} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('All Accounts')).toBeInTheDocument()
      expect(screen.getAllByText('Live Account')[0]).toBeInTheDocument()
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })
  })

  it('calls onAccountSelect when account is selected', async () => {
    render(<AccountSelector {...defaultProps} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })

    const testAccount = screen.getByText('Test Account')
    fireEvent.click(testAccount)

    expect(defaultProps.onAccountChange).toHaveBeenCalledWith('3')
  })

  it('shows loading state initially', () => {
    render(<AccountSelector {...defaultProps} />)

    expect(screen.getByText('', { selector: '.animate-pulse' })).toBeInTheDocument()
  })
})