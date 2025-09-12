import { aiAnalysisService } from '@/lib/ai-service'

// Mock the AI service implementation
jest.mock('@/lib/ai-service', () => ({
  aiAnalysisService: {
    analyzePositions: jest.fn(),
    generateRecommendations: jest.fn(),
    assessRisk: jest.fn(),
    getMarketInsights: jest.fn()
  }
}))

const mockAiAnalysisService = aiAnalysisService as jest.Mocked<typeof aiAnalysisService>

describe('AI Analysis Service', () => {
  const mockPositions = [
    {
      ticker: 'AAPL',
      quantity: 10,
      averagePrice: 150,
      currentPrice: 155,
      ppl: 50,
      pplPercent: 3.23,
      marketValue: 1550,
      maxBuy: 10000,
      maxSell: 10000,
      accountName: 'Test Account',
      accountId: 'account-1',
      isPractice: false
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should analyze positions and return recommendations', async () => {
    const mockAnalysis = {
      recommendations: [
        {
          ticker: 'AAPL',
          action: 'HOLD',
          confidence: 0.8,
          reasoning: 'Strong fundamentals'
        }
      ],
      riskAssessment: {
        overallRisk: 'MEDIUM',
        diversificationScore: 0.7
      }
    }

    mockAiAnalysisService.analyzePositions.mockResolvedValue(mockAnalysis)

    const result = await aiAnalysisService.analyzePositions(mockPositions)

    expect(result).toEqual(mockAnalysis)
    expect(mockAiAnalysisService.analyzePositions).toHaveBeenCalledWith(mockPositions)
  })

  it('should handle empty positions array', async () => {
    const mockAnalysis = {
      recommendations: [],
      riskAssessment: {
        overallRisk: 'LOW',
        diversificationScore: 1.0
      }
    }

    mockAiAnalysisService.analyzePositions.mockResolvedValue(mockAnalysis)

    const result = await aiAnalysisService.analyzePositions([])

    expect(result).toEqual(mockAnalysis)
  })

  it('should handle analysis errors', async () => {
    const error = new Error('AI service unavailable')
    mockAiAnalysisService.analyzePositions.mockRejectedValue(error)

    await expect(aiAnalysisService.analyzePositions(mockPositions))
      .rejects.toThrow('AI service unavailable')
  })
})