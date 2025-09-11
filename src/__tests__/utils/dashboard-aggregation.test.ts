// Test utility functions for dashboard aggregation logic
// Since the aggregation logic is embedded in the dashboard component,
// we'll extract and test the core calculation functions

interface MockAccountData {
  stats: {
    totalPnL: number
    todayPnL: number
    activePositions: number
  }
  portfolio: Array<{
    quantity: number
    currentPrice: number
  }>
  cash?: number
}

// Extracted aggregation logic from dashboard
export function aggregateAccountStats(accountResults: Array<{ data: MockAccountData }>) {
  let totalCurrentValue = 0
  let totalInvestedValue = 0
  let totalPnL = 0
  let todayPnL = 0
  let activePositions = 0
  let totalCash = 0

  for (const result of accountResults) {
    const { data } = result
    if (!data || data.stats === undefined) continue

    // Calculate current value from portfolio
    const accountCurrentValue = data.portfolio?.reduce((sum: number, pos: any) => 
      sum + (pos.quantity * pos.currentPrice), 0) || 0
    
    // Calculate invested value (current value - P&L)
    const accountInvestedValue = accountCurrentValue - (data.stats.totalPnL || 0)
    
    totalCurrentValue += accountCurrentValue
    totalInvestedValue += accountInvestedValue
    totalPnL += data.stats.totalPnL || 0
    todayPnL += data.stats.todayPnL || 0
    activePositions += data.stats.activePositions || 0
    totalCash += data.cash || 0
  }

  // Calculate percentages based on invested value
  const totalPnLPercent = totalInvestedValue > 0 ? (totalPnL / totalInvestedValue) * 100 : 0
  const todayPnLPercent = totalInvestedValue > 0 ? (todayPnL / totalInvestedValue) * 100 : 0

  return {
    totalPnL,
    totalPnLPercent,
    todayPnL,
    todayPnLPercent,
    activePositions,
    totalCash,
    totalCurrentValue,
    totalInvestedValue,
  }
}

describe('Dashboard Aggregation Logic', () => {
  describe('aggregateAccountStats', () => {
    it('should correctly aggregate stats from multiple accounts', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: 100,
              todayPnL: 20,
              activePositions: 5,
            },
            portfolio: [
              { quantity: 10, currentPrice: 150 }, // $1500
              { quantity: 5, currentPrice: 200 },   // $1000
            ],
            cash: 500,
          },
        },
        {
          data: {
            stats: {
              totalPnL: 200,
              todayPnL: 50,
              activePositions: 3,
            },
            portfolio: [
              { quantity: 8, currentPrice: 100 },   // $800
              { quantity: 2, currentPrice: 300 },   // $600
            ],
            cash: 300,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults)

      expect(result.totalPnL).toBe(300) // 100 + 200
      expect(result.todayPnL).toBe(70)  // 20 + 50
      expect(result.activePositions).toBe(8) // 5 + 3
      expect(result.totalCash).toBe(800) // 500 + 300
      expect(result.totalCurrentValue).toBe(3900) // 1500 + 1000 + 800 + 600
      expect(result.totalInvestedValue).toBe(3600) // 3900 - 300 (total P&L)
      
      // Percentages based on invested value
      expect(result.totalPnLPercent).toBeCloseTo(8.33, 2) // 300 / 3600 * 100
      expect(result.todayPnLPercent).toBeCloseTo(1.94, 2) // 70 / 3600 * 100
    })

    it('should handle accounts with no portfolio', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: 50,
              todayPnL: 10,
              activePositions: 0,
            },
            portfolio: [], // Empty portfolio
            cash: 1000,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults)

      expect(result.totalPnL).toBe(50)
      expect(result.todayPnL).toBe(10)
      expect(result.activePositions).toBe(0)
      expect(result.totalCash).toBe(1000)
      expect(result.totalCurrentValue).toBe(0)
      expect(result.totalInvestedValue).toBe(-50) // 0 - 50 (P&L)
      expect(result.totalPnLPercent).toBe(0) // No invested value
      expect(result.todayPnLPercent).toBe(0)
    })

    it('should handle negative P&L correctly', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: -100,
              todayPnL: -30,
              activePositions: 2,
            },
            portfolio: [
              { quantity: 10, currentPrice: 90 }, // $900
            ],
            cash: 100,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults)

      expect(result.totalPnL).toBe(-100)
      expect(result.todayPnL).toBe(-30)
      expect(result.totalCurrentValue).toBe(900)
      expect(result.totalInvestedValue).toBe(1000) // 900 - (-100)
      expect(result.totalPnLPercent).toBe(-10) // -100 / 1000 * 100
      expect(result.todayPnLPercent).toBe(-3) // -30 / 1000 * 100
    })

    it('should handle missing or undefined data gracefully', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: 50,
              todayPnL: 10,
              activePositions: 1,
            },
            portfolio: [
              { quantity: 5, currentPrice: 100 },
            ],
          }, // No cash property
        },
        {
          data: {
            stats: {
              totalPnL: undefined, // Undefined P&L
              todayPnL: undefined,
              activePositions: undefined,
            },
            portfolio: undefined, // Undefined portfolio
            cash: 200,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults as any)

      expect(result.totalPnL).toBe(50) // Only first account
      expect(result.todayPnL).toBe(10)
      expect(result.activePositions).toBe(1)
      expect(result.totalCash).toBe(200) // Only second account has cash
      expect(result.totalCurrentValue).toBe(500) // Only first account
    })

    it('should handle empty account results', () => {
      const accountResults: Array<{ data: MockAccountData }> = []

      const result = aggregateAccountStats(accountResults)

      expect(result.totalPnL).toBe(0)
      expect(result.todayPnL).toBe(0)
      expect(result.activePositions).toBe(0)
      expect(result.totalCash).toBe(0)
      expect(result.totalCurrentValue).toBe(0)
      expect(result.totalInvestedValue).toBe(0)
      expect(result.totalPnLPercent).toBe(0)
      expect(result.todayPnLPercent).toBe(0)
    })

    it('should handle zero invested value edge case', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: 100, // P&L equals current value
              todayPnL: 20,
              activePositions: 1,
            },
            portfolio: [
              { quantity: 10, currentPrice: 10 }, // $100 current value
            ],
            cash: 0,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults)

      expect(result.totalCurrentValue).toBe(100)
      expect(result.totalInvestedValue).toBe(0) // 100 - 100 = 0
      expect(result.totalPnLPercent).toBe(0) // Should not divide by zero
      expect(result.todayPnLPercent).toBe(0)
    })

    it('should correctly handle mixed positive and negative P&L across accounts', () => {
      const accountResults = [
        {
          data: {
            stats: {
              totalPnL: 150,  // Profitable account
              todayPnL: 30,
              activePositions: 3,
            },
            portfolio: [
              { quantity: 10, currentPrice: 115 }, // $1150
            ],
            cash: 100,
          },
        },
        {
          data: {
            stats: {
              totalPnL: -50,  // Losing account
              todayPnL: -10,
              activePositions: 2,
            },
            portfolio: [
              { quantity: 5, currentPrice: 90 }, // $450
            ],
            cash: 50,
          },
        },
      ]

      const result = aggregateAccountStats(accountResults)

      expect(result.totalPnL).toBe(100) // 150 + (-50)
      expect(result.todayPnL).toBe(20)  // 30 + (-10)
      expect(result.totalCurrentValue).toBe(1600) // 1150 + 450
      expect(result.totalInvestedValue).toBe(1500) // 1600 - 100
      expect(result.totalPnLPercent).toBeCloseTo(6.67, 2) // 100 / 1500 * 100
      expect(result.todayPnLPercent).toBeCloseTo(1.33, 2) // 20 / 1500 * 100
    })
  })
})
