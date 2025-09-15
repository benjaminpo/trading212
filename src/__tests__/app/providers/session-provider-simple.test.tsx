import React from 'react'
import { render } from '@testing-library/react'
import { SessionProvider } from '../../../app/providers/session-provider'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-auth-session-provider">{children}</div>
  )
}))

describe('SessionProvider', () => {
  it('should render children', () => {
    const { getByTestId } = render(
      <SessionProvider>
        <div data-testid="test-child">Test content</div>
      </SessionProvider>
    )

    expect(getByTestId('test-child')).toBeDefined()
    expect(getByTestId('test-child')).toHaveTextContent('Test content')
  })

  it('should wrap children in next-auth SessionProvider', () => {
    const { getByTestId } = render(
      <SessionProvider>
        <div data-testid="test-child">Test</div>
      </SessionProvider>
    )

    expect(getByTestId('next-auth-session-provider')).toBeDefined()
    expect(getByTestId('test-child')).toBeDefined()
  })

  it('should handle multiple children', () => {
    const { getByTestId } = render(
      <SessionProvider>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </SessionProvider>
    )

    expect(getByTestId('child1')).toBeDefined()
    expect(getByTestId('child2')).toBeDefined()
  })

  it('should handle empty children', () => {
    const { getByTestId } = render(
      <SessionProvider>
        {null}
      </SessionProvider>
    )

    expect(getByTestId('next-auth-session-provider')).toBeDefined()
  })
})
