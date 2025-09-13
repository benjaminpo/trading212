import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  )
}))

describe('ThemeProvider', () => {
  it('should render children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Test Content</div>
      </ThemeProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should pass props to next-themes ThemeProvider', () => {
    const props = {
      attribute: 'class' as const,
      defaultTheme: 'system',
      enableSystem: true,
      disableTransitionOnChange: false
    }

    render(
      <ThemeProvider {...props}>
        <div data-testid="child">Test Content</div>
      </ThemeProvider>
    )

    const themeProvider = screen.getByTestId('theme-provider')
    const receivedProps = JSON.parse(themeProvider.getAttribute('data-props') || '{}')

    expect(receivedProps).toEqual(props)
  })

  it('should handle empty children', () => {
    render(<ThemeProvider />)

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <span data-testid="child3">Child 3</span>
      </ThemeProvider>
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
    expect(screen.getByTestId('child3')).toBeInTheDocument()
  })

  it('should pass through all theme-related props', () => {
    const themeProps = {
      attribute: 'data-theme' as const,
      defaultTheme: 'dark',
      enableSystem: false,
      disableTransitionOnChange: true,
      themes: ['light', 'dark'],
      forcedTheme: 'light'
    }

    render(
      <ThemeProvider {...themeProps}>
        <div data-testid="child">Test</div>
      </ThemeProvider>
    )

    const themeProvider = screen.getByTestId('theme-provider')
    const receivedProps = JSON.parse(themeProvider.getAttribute('data-props') || '{}')

    expect(receivedProps).toEqual(themeProps)
  })

  it('should handle custom theme configuration', () => {
    const customProps = {
      attribute: 'class' as const,
      defaultTheme: 'light',
      enableSystem: true,
      themes: ['light', 'dark', 'custom'],
      storageKey: 'custom-theme-storage'
    }

    render(
      <ThemeProvider {...customProps}>
        <div data-testid="child">Custom Theme</div>
      </ThemeProvider>
    )

    const themeProvider = screen.getByTestId('theme-provider')
    const receivedProps = JSON.parse(themeProvider.getAttribute('data-props') || '{}')

    expect(receivedProps).toEqual(customProps)
  })
})
