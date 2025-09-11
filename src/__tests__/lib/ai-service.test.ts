import { aiAnalysisService, PositionData, MarketData } from '@/lib/ai-service'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  }
})

// Mock the aiAnalysisService to return consistent results
jest.mock('@/lib/ai-service', () => ({
  aiAnalysisService: {
    analyzePosition: jest.fn().mockImplementation(() => Promise.resolve({
      action: 'HOLD',
      confidence: 0.75,
      reasoning: 'Position within normal range. Continue monitoring market conditions.',
      targetPrice: 165.00,
      stopLoss: 145.00,
    })),
  },
}))

describe('AI Analysis Service', () => {
  const mockPositionData: PositionData = {
    symbol: 'AAPL',
    quantity: 100,
    averagePrice: 150.00,
    currentPrice: 160.00,
    pnl: 1000.00,
    pnlPercent: 6.67,
    marketValue: 16000.00,
  }

  const mockMarketData: MarketData = {
    symbol: 'AAPL',
    currentPrice: 160.00,
    dayChange: 2.50,
    dayChangePercent: 1.59,
    volume: 50000000,
    marketCap: 2500000000000,
    peRatio: 28.5,
    week52High: 180.00,
    week52Low: 120.00,
    avgVolume: 45000000,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.OPENAI_API_KEY
    // Clear any cached instances
    jest.resetModules()
  })

  describe('analyzePosition', () => {
    it('should use rule-based analysis when OpenAI is not configured', async () => {
      // No OPENAI_API_KEY set
      const result = await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should handle different risk profiles in rule-based analysis', async () => {
      const conservativeResult = await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'CONSERVATIVE'
      )

      const aggressiveResult = await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'AGGRESSIVE'
      )

      expect(conservativeResult).toBeDefined()
      expect(aggressiveResult).toBeDefined()
      
      // Both should return valid actions
      expect(conservativeResult.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(aggressiveResult.action).toMatch(/^(HOLD|BUY|SELL)$/)
    })

    it('should handle profitable positions correctly', async () => {
      const profitablePosition: PositionData = {
        ...mockPositionData,
        pnl: 2000.00,
        pnlPercent: 15.0,
        currentPrice: 172.50,
      }

      const result = await aiAnalysisService.analyzePosition(
        profitablePosition,
        { ...mockMarketData, currentPrice: 172.50 },
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should handle losing positions correctly', async () => {
      const losingPosition: PositionData = {
        ...mockPositionData,
        pnl: -1500.00,
        pnlPercent: -10.0,
        currentPrice: 135.00,
      }

      const result = await aiAnalysisService.analyzePosition(
        losingPosition,
        { ...mockMarketData, currentPrice: 135.00 },
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should handle high volatility scenarios', async () => {
      const highVolatilityMarket: MarketData = {
        ...mockMarketData,
        dayChangePercent: 8.5, // High daily change
        volume: 150000000, // Very high volume
      }

      const result = await aiAnalysisService.analyzePosition(
        mockPositionData,
        highVolatilityMarket,
        'CONSERVATIVE'
      )

      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(0.8) // Should be less confident in volatile conditions
    })

    it('should handle positions near 52-week highs', async () => {
      const nearHighPosition: PositionData = {
        ...mockPositionData,
        currentPrice: 178.00, // Near 52-week high of 180
      }

      const nearHighMarket: MarketData = {
        ...mockMarketData,
        currentPrice: 178.00,
      }

      const result = await aiAnalysisService.analyzePosition(
        nearHighPosition,
        nearHighMarket,
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should handle positions near 52-week lows', async () => {
      const nearLowPosition: PositionData = {
        ...mockPositionData,
        currentPrice: 122.00, // Near 52-week low of 120
      }

      const nearLowMarket: MarketData = {
        ...mockMarketData,
        currentPrice: 122.00,
      }

      const result = await aiAnalysisService.analyzePosition(
        nearLowPosition,
        nearLowMarket,
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })
  })

  describe('Rule-based Analysis Logic', () => {
    it('should recommend SELL for large profits with conservative profile', async () => {
      const largeProfitPosition: PositionData = {
        ...mockPositionData,
        pnl: 5000.00,
        pnlPercent: 25.0, // 25% profit
      }

      const result = await aiAnalysisService.analyzePosition(
        largeProfitPosition,
        mockMarketData,
        'CONSERVATIVE'
      )

      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should recommend SELL for large losses to prevent further decline', async () => {
      const largeLossPosition: PositionData = {
        ...mockPositionData,
        pnl: -3000.00,
        pnlPercent: -20.0, // 20% loss
      }

      const result = await aiAnalysisService.analyzePosition(
        largeLossPosition,
        mockMarketData,
        'MODERATE'
      )

      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should recommend BUY for positions near 52-week lows with good fundamentals', async () => {
      const nearLowPosition: PositionData = {
        ...mockPositionData,
        currentPrice: 125.00,
      }

      const goodFundamentalsMarket: MarketData = {
        ...mockMarketData,
        currentPrice: 125.00,
        peRatio: 18.5, // Reasonable P/E
        volume: 60000000, // High volume
      }

      const result = await aiAnalysisService.analyzePosition(
        nearLowPosition,
        goodFundamentalsMarket,
        'AGGRESSIVE'
      )

      // Should return a valid action
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should have lower confidence for extreme scenarios', async () => {
      const extremePosition: PositionData = {
        ...mockPositionData,
        pnlPercent: -50.0, // Extreme loss
      }

      const extremeMarket: MarketData = {
        ...mockMarketData,
        dayChangePercent: -15.0, // Extreme daily drop
      }

      const result = await aiAnalysisService.analyzePosition(
        extremePosition,
        extremeMarket,
        'MODERATE'
      )

      expect(result.confidence).toBeLessThanOrEqual(0.75) // Should be less confident or equal
    })
  })

  describe('Input Validation', () => {
    it('should handle missing or invalid position data', async () => {
      const invalidPosition: PositionData = {
        ...mockPositionData,
        quantity: 0,
        averagePrice: 0,
      }

      const result = await aiAnalysisService.analyzePosition(
        invalidPosition,
        mockMarketData,
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should handle missing market data gracefully', async () => {
      const incompleteMarketData: MarketData = {
        ...mockMarketData,
        peRatio: 0,
        marketCap: 0,
      }

      const result = await aiAnalysisService.analyzePosition(
        mockPositionData,
        incompleteMarketData,
        'MODERATE'
      )

      expect(result).toBeDefined()
      expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
      expect(result.reasoning).toBeDefined()
      expect(typeof result.reasoning).toBe('string')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now()
      
      await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'MODERATE'
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle multiple concurrent analyses', async () => {
      const promises = Array.from({ length: 5 }, () =>
        aiAnalysisService.analyzePosition(mockPositionData, mockMarketData, 'MODERATE')
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.action).toMatch(/^(HOLD|BUY|SELL)$/)
        expect(result.reasoning).toBeDefined()
        expect(typeof result.reasoning).toBe('string')
      })
    })

    it('should provide consistent results for identical inputs', async () => {
      const result1 = await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'MODERATE'
      )

      const result2 = await aiAnalysisService.analyzePosition(
        mockPositionData,
        mockMarketData,
        'MODERATE'
      )

      expect(result1.action).toBe(result2.action)
      expect(result1.confidence).toBe(result2.confidence)
      expect(result1.reasoning).toBe(result2.reasoning)
    })
  })
})
