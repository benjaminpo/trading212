import React from 'react'
import { render } from '@testing-library/react'
import { useSession } from 'next-auth/react'

export const setSession = (
  status: 'authenticated' | 'unauthenticated' | 'loading',
  user: unknown = { name: 'Test User' }
) => {
  ;(useSession as unknown as jest.Mock).mockReturnValue({
    data: status === 'authenticated' ? { user } : null,
    status
  })
}

export const mockFetchJson = (data: unknown, ok: boolean = true) => {
  ;(global.fetch as unknown as jest.Mock).mockResolvedValue({
    ok,
    json: async () => data
  })
}

export const renderPageByPath = async (path: string) => {
  const Page = (await import(path)).default
  render(React.createElement(Page))
}


