import { optimizedTrading212Service } from '@/lib/optimized-trading212'

jest.mock('@/lib/api-batcher', () => ({
  apiBatcher: {
    fetchAccountData: jest.fn()
  }
}))

jest.mock('@/lib/api-cache', () => ({
  apiCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('optimized-trading212 today P/L', () => {
  it('computes todayPnL and todayPnLPercent from account.result and totalValue', async () => {
    const { apiBatcher } = require('@/lib/api-batcher')

    // totalValue = 10000; today result = 100 => ~1.0101%
    apiBatcher.fetchAccountData.mockResolvedValue({
      account: {
        id: 'acc1',
        currencyCode: 'USD',
        cash: 0,
        ppl: 0,
        result: 100,
        blockedForStocks: 0,
        blockedForOrders: 0,
        pieCash: 0
      },
      portfolio: [],
      orders: [],
      stats: {
        activePositions: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        totalValue: 10000,
        todayPnL: 0,
        todayPnLPercent: 0
      }
    })

    const data = await optimizedTrading212Service.getAccountData(
      'user1',
      'acc1',
      'key',
      true,
      false
    )

    expect(data.stats.todayPnL).toBe(100)
    // Allow small floating error
    expect(data.stats.todayPnLPercent).toBeGreaterThan(1.0)
    expect(data.stats.todayPnLPercent).toBeLessThan(1.02)
  })
})


