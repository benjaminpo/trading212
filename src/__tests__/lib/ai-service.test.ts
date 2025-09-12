import { aiAnalysisService, AIRecommendationResult, PositionData, MarketData } from '@/lib/ai-service'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

describe('AIAnalysisService', () => {
  const mockPosition: PositionData = {
    symbol: 'AAPL',
    quantity: 100,
    averagePrice: 150,
    currentPrice: 160,
    pnl: 1000,
    pnlPercent: 6.67,
    marketValue: 16000
  }

  const mockMarketData: MarketData = {
    symbol: 'AAPL',
    price: 160,
    volume: 1000000,
    change: 2.5,
    changePercent: 1.59,
    high52Week: 180,
    low52Week: 120,
    marketCap: 2500000000000,
    pe: 25,
    beta: 1.2
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variable
    delete process.env.OPENAI_API_KEY
  })

  describe('constructor', () => {
    it('should initialize without OpenAI when API key is not provided', () => {
      const service = aiAnalysisService
      expect(service).toBeDefined()
    })

    it('should initialize with OpenAI when API key is provided', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      const service = aiAnalysisService
      expect(service).toBeDefined()
    })
  })

  describe('analyzePosition', () => {
    it('should use rule-based analysis when OpenAI is not available', async () => {
      const result = await aiAnalysisService.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      
      expect(result).toMatchObject({
        recommendationType: expect.any(String),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        suggestedAction: expect.any(String),
        riskLevel: expect.any(String),
        timeframe: expect.any(String)
      })
      
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle different risk profiles in rule-based analysis', async () => {
      const conservativeResult = await aiAnalysisService.analyzePosition(mockPosition, mockMarketData, 'CONSERVATIVE')
      const moderateResult = await aiAnalysisService.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      const aggressiveResult = await aiAnalysisService.analyzePosition(mockPosition, mockMarketData, 'AGGRESSIVE')
      
      expect(conservativeResult).toBeDefined()
      expect(moderateResult).toBeDefined()
      expect(aggressiveResult).toBeDefined()
    })

    it('should recommend EXIT for high profits near 52-week high', async () => {
      const highProfitPosition: PositionData = {
        ...mockPosition,
        pnl: 3000,
        pnlPercent: 21 // > 20%
      }
      
      const nearHighMarketData: MarketData = {
        ...mockMarketData,
        price: 175, // Close to 52-week high of 180 (priceFromHigh < 10%)
        high52Week: 180
      }
      
      const result = await aiAnalysisService.analyzePosition(highProfitPosition, nearHighMarketData, 'MODERATE')
      
      expect(result.recommendationType).toBe('EXIT')
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.riskLevel).toBe('LOW')
    })

    it('should recommend EXIT for significant losses', async () => {
      const lossPosition: PositionData = {
        ...mockPosition,
        pnl: -2000,
        pnlPercent: -16 // < -15%
      }
      
      const result = await aiAnalysisService.analyzePosition(lossPosition, mockMarketData, 'MODERATE')
      
      expect(result.recommendationType).toBe('EXIT')
      expect(result.confidence).toBeGreaterThan(0.6)
      expect(result.riskLevel).toBe('HIGH')
    })

    it('should recommend REDUCE for conservative profile with good profits', async () => {
      const profitPosition: PositionData = {
        ...mockPosition,
        pnl: 1500,
        pnlPercent: 11 // > 10%
      }
      
      const result = await aiAnalysisService.analyzePosition(profitPosition, mockMarketData, 'CONSERVATIVE')
      
      expect(result.recommendationType).toBe('REDUCE')
      expect(result.confidence).toBeGreaterThan(0.6)
      expect(result.riskLevel).toBe('LOW')
    })

    it('should recommend HOLD for normal conditions', async () => {
      const normalPosition: PositionData = {
        ...mockPosition,
        pnl: 200,
        pnlPercent: 1.3
      }
      
      const result = await aiAnalysisService.analyzePosition(normalPosition, mockMarketData, 'MODERATE')
      
      expect(result.recommendationType).toBe('HOLD')
      expect(result.confidence).toBeGreaterThanOrEqual(0.5)
    })
  })

  describe('analyzeBulkPositions', () => {
    it('should analyze multiple positions', async () => {
      const positions: PositionData[] = [
        mockPosition,
        {
          ...mockPosition,
          symbol: 'GOOGL',
          pnl: 500,
          pnlPercent: 2.5
        }
      ]
      
      const marketData: MarketData[] = [
        mockMarketData,
        {
          ...mockMarketData,
          symbol: 'GOOGL',
          price: 2500
        }
      ]
      
      const results = await aiAnalysisService.analyzeBulkPositions(positions, marketData, 'MODERATE')
      
      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        recommendationType: expect.any(String),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        suggestedAction: expect.any(String),
        riskLevel: expect.any(String),
        timeframe: expect.any(String)
      })
      expect(results[1]).toMatchObject({
        recommendationType: expect.any(String),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        suggestedAction: expect.any(String),
        riskLevel: expect.any(String),
        timeframe: expect.any(String)
      })
    })

    it('should handle positions without matching market data', async () => {
      const positions: PositionData[] = [
        mockPosition,
        {
          ...mockPosition,
          symbol: 'UNKNOWN',
          pnl: 500,
          pnlPercent: 2.5
        }
      ]
      
      const marketData: MarketData[] = [mockMarketData] // Only AAPL market data
      
      const results = await aiAnalysisService.analyzeBulkPositions(positions, marketData, 'MODERATE')
      
      expect(results).toHaveLength(1) // Only AAPL should be analyzed
    })

    it('should handle empty positions array', async () => {
      const results = await aiAnalysisService.analyzeBulkPositions([], [], 'MODERATE')
      
      expect(results).toHaveLength(0)
    })
  })

  describe('with OpenAI integration', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should use OpenAI when available and return parsed response', async () => {
      const mockOpenAI = require('openai').default
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendationType: 'EXIT',
              confidence: 0.85,
              reasoning: 'Strong technical indicators suggest taking profits',
              suggestedAction: 'Sell position',
              targetPrice: 170,
              stopLoss: 150,
              riskLevel: 'LOW',
              timeframe: 'SHORT'
            })
          }
        }]
      })

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      // Create service instance with API key to trigger OpenAI initialization
      const serviceWithOpenAI = new (require('@/lib/ai-service').AIAnalysisService)()
      // Set the openai property directly since we mocked the constructor
      serviceWithOpenAI.openai = new mockOpenAI()
      
      const result = await serviceWithOpenAI.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      
      expect(mockCreate).toHaveBeenCalled()
      expect(result.recommendationType).toBe('EXIT')
      expect(result.confidence).toBe(0.85)
      expect(result.reasoning).toBe('Strong technical indicators suggest taking profits')
    })

    it('should fallback to rule-based analysis when OpenAI fails', async () => {
      const mockOpenAI = require('openai').default
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'))

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      // Create service instance with API key to trigger OpenAI initialization
      const serviceWithOpenAI = new (require('@/lib/ai-service').AIAnalysisService)()
      serviceWithOpenAI.openai = new mockOpenAI()
      
      const result = await serviceWithOpenAI.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      
      // Should fallback to rule-based analysis since OpenAI failed
      expect(result.recommendationType).toBe('HOLD')
      expect(result.confidence).toBe(0.5)
    })

    it('should handle invalid JSON response from OpenAI', async () => {
      const mockOpenAI = require('openai').default
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      })

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      // Create service instance with API key to trigger OpenAI initialization
      const serviceWithOpenAI = new (require('@/lib/ai-service').AIAnalysisService)()
      serviceWithOpenAI.openai = new mockOpenAI()
      
      const result = await serviceWithOpenAI.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      
      // Should fallback to rule-based analysis due to invalid JSON
      expect(result.recommendationType).toBe('HOLD')
      expect(result.confidence).toBe(0.5)
    })

    it('should handle empty response from OpenAI', async () => {
      const mockOpenAI = require('openai').default
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      })

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }))

      // Create service instance with API key to trigger OpenAI initialization
      const serviceWithOpenAI = new (require('@/lib/ai-service').AIAnalysisService)()
      serviceWithOpenAI.openai = new mockOpenAI()
      
      const result = await serviceWithOpenAI.analyzePosition(mockPosition, mockMarketData, 'MODERATE')
      
      // Should fallback to rule-based analysis due to empty response
      expect(result.recommendationType).toBe('HOLD')
      expect(result.confidence).toBe(0.5)
    })
  })

  describe('edge cases', () => {
    it('should handle zero values in position data', async () => {
      const zeroPosition: PositionData = {
        symbol: 'TEST',
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        pnl: 0,
        pnlPercent: 0,
        marketValue: 0
      }
      
      const zeroMarketData: MarketData = {
        symbol: 'TEST',
        price: 0,
        volume: 0,
        change: 0,
        changePercent: 0,
        high52Week: 0,
        low52Week: 0
      }
      
      const result = await aiAnalysisService.analyzePosition(zeroPosition, zeroMarketData, 'MODERATE')
      
      expect(result).toBeDefined()
      expect(result.recommendationType).toBe('HOLD')
    })

    it('should handle negative values in position data', async () => {
      const negativePosition: PositionData = {
        symbol: 'TEST',
        quantity: -100,
        averagePrice: 150,
        currentPrice: 140,
        pnl: -1000,
        pnlPercent: -16, // < -15% to trigger EXIT
        marketValue: -14000
      }
      
      const result = await aiAnalysisService.analyzePosition(negativePosition, mockMarketData, 'MODERATE')
      
      expect(result).toBeDefined()
      expect(result.recommendationType).toBe('EXIT')
    })

    it('should handle missing optional market data fields', async () => {
      const minimalMarketData: MarketData = {
        symbol: 'TEST',
        price: 100,
        volume: 1000,
        change: 1,
        changePercent: 1,
        high52Week: 110,
        low52Week: 90
        // No pe, beta, marketCap
      }
      
      const result = await aiAnalysisService.analyzePosition(mockPosition, minimalMarketData, 'MODERATE')
      
      expect(result).toBeDefined()
      expect(result.recommendationType).toBe('HOLD')
    })
  })
})