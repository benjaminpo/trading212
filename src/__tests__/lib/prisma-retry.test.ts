jest.mock('@/lib/prisma', () => {
  const actual = jest.requireActual('@/lib/prisma')
  return {
    ...actual,
    globalForPrisma: { prisma: undefined },
  }
})

import { retryDatabaseOperation } from '@/lib/prisma'

describe('retryDatabaseOperation', () => {
  jest.setTimeout(10000)

  it('returns value when operation succeeds first try', async () => {
    const result = await retryDatabaseOperation(async () => 'ok', 2)
    expect(result).toBe('ok')
  })

  it('retries on transient errors and then succeeds', async () => {
    ;(global as any).prisma = undefined
    const errors = [
      new Error('prepared statement "x" does not exist'),
      Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })
    ]
    let calls = 0
    const result = await retryDatabaseOperation(async () => {
      const i = calls++
      if (i < errors.length) throw errors[i]
      return 'ok-after-retry'
    }, 5)
    expect(result).toBe('ok-after-retry')
    expect(calls).toBe(errors.length + 1)
  })

  it('throws when max retries exceeded for non-transient error', async () => {
    await expect(
      retryDatabaseOperation(async () => {
        throw Object.assign(new Error('syntax error'), { code: '42P01' })
      }, 2)
    ).rejects.toThrow()
  })
})


