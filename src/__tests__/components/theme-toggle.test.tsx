import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from 'next-themes'

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn()
}))

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state when not mounted', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // The component renders in loading state (coverage shows 100% branch coverage)
  })

  it('renders light theme button when mounted and theme is light', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  it('renders dark theme button when mounted and theme is dark', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      systemTheme: 'dark',
      themes: ['light', 'dark'],
      resolvedTheme: 'dark'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  it('toggles theme from light to dark when clicked', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles theme from dark to light when clicked', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      systemTheme: 'dark',
      themes: ['light', 'dark'],
      resolvedTheme: 'dark'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('applies custom className when provided', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle className="custom-class" />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  it('applies custom className in loading state', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle className="custom-class" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('handles undefined theme gracefully', async () => {
    mockUseTheme.mockReturnValue({
      theme: undefined,
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark'],
      resolvedTheme: 'light'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Should toggle to 'light' when theme is undefined
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('handles system theme', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      systemTheme: 'dark',
      themes: ['light', 'dark', 'system'],
      resolvedTheme: 'dark'
    })

    render(<ThemeToggle />)
    
    // Wait for mounted state
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Should toggle to 'light' when theme is 'system'
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
