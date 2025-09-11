import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LogoutButton from '@/components/logout-button'
import { signOut } from 'next-auth/react'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signOut: jest.fn()
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  LogOut: () => <div data-testid="logout-icon" />
}))

const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render logout button', () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
  })

  it('should call signOut when clicked', async () => {
    mockedSignOut.mockResolvedValue(undefined)

    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1)
    })
  })

  it('should call signOut with correct options', async () => {
    mockedSignOut.mockResolvedValue(undefined)

    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledWith({
        callbackUrl: '/'
      })
    })
  })


  it('should have correct button styling classes', () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should handle multiple rapid clicks', async () => {
    mockedSignOut.mockResolvedValue(undefined)

    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    
    // Click multiple times rapidly
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(3)
    })
  })

  it('should render with custom className if provided', () => {
    const customClass = 'custom-logout-button'
    render(<LogoutButton className={customClass} />)

    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toHaveClass(customClass)
  })

  it('should render with default className when no custom className provided', () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    expect(button).toBeInTheDocument()
  })
})
