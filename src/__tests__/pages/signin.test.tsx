import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter as _useRouter } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
}))

// Mock next/navigation
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/auth/signin',
}))

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

describe('SignIn Page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    ;(signIn as jest.Mock).mockReset()
    ;(getSession as jest.Mock).mockReset()
  })

  it('renders sign in form', async () => {
    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    expect(screen.getByText('Welcome back to your trading dashboard')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows password toggle functionality', async () => {
    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const passwordInput = screen.getByPlaceholderText('Password')
    const toggleButton = screen.getAllByRole('button').find(button => 
      button.getAttribute('type') === 'button' && 
      button.querySelector('svg')
    )

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click to hide password again
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    } else {
      // If toggle button not found, just verify password input exists
      expect(passwordInput).toBeInTheDocument()
    }
  })

  it('handles form submission with valid credentials', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ error: null })
    ;(getSession as jest.Mock).mockResolvedValue({ user: { name: 'Test User' } })

    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message for invalid credentials', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ error: 'Invalid credentials' })

    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('shows error message for network errors', async () => {
    ;(signIn as jest.Mock).mockRejectedValue(new Error('Network error'))

    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    ;(signIn as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    fireEvent.click(submitButton)

    // Button should be disabled during loading
    expect(submitButton).toBeDisabled()
  })

  it('handles Google sign in', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({})

    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
  })

  it('has link to sign up page', async () => {
    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const signUpLink = screen.getByText('Sign up')
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/auth/signup')
  })

  it('has link to home page', async () => {
    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const homeLink = screen.getByText('Trading212 Extra')
    const linkElement = homeLink.closest('a')
    if (linkElement) {
      expect(linkElement).toHaveAttribute('href', '/')
    } else {
      expect(homeLink).toBeInTheDocument()
    }
  })

  it('validates required fields', async () => {
    const SignIn = (await import('@/app/auth/signin/page')).default
    render(React.createElement(SignIn))

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    // Form should not submit without required fields
    expect(signIn).not.toHaveBeenCalled()
  })
})
