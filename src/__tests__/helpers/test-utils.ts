import React from 'react'
import { render } from '@testing-library/react'
import { useSession } from 'next-auth/react'

// Common session helper
export const setSession = (
  status: 'authenticated' | 'unauthenticated' | 'loading',
  user: unknown = { name: 'Test User' }
) => {
  ;(useSession as unknown as jest.Mock).mockReturnValue({
    data: status === 'authenticated' ? { user } : null,
    status
  })
}

// Common fetch mock helper
export const mockFetchJson = (data: unknown, ok: boolean = true) => {
  ;(global.fetch as unknown as jest.Mock).mockResolvedValue({
    ok,
    json: async () => data
  })
}

// Render a Next.js page component by dynamic import path
export const renderPageByPath = async (path: string) => {
  const Page = (await import(path)).default
  render(React.createElement(Page))
}


