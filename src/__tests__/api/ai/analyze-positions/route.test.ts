import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/analyze-positions/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'
import { aiAnalysisService } from '@/lib/ai-service'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    position: {
      upsert: jest.fn(),
      findFirst: jest.fn()
    },
    aIRecommendation: {
      updateMany: jest.fn(),
      create: jest.fn()
    },
    aIAnalysisLog: {
      create: jest.fn()
    }
  },
  retryDatabaseOperation: jest.fn((operation) => operation())
}))
jest.mock('@/lib/trading212')
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
})
jest.mock('@/lib/ai-service', () => ({
  aiAnalysisService: {
    analyzePosition: jest.fn(),
    analyzeBulkPositions: jest.fn()
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockTrading212API = Trading212API as jest.MockedClass<typeof Trading212API>
const mockAiAnalysisService = aiAnalysisService as jest.Mocked<typeof aiAnalysisService>

describe('/api/ai/analyze-positions', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    trading212Accounts: [
      {
        id: 'account-1',
        name: 'Test Account',
        apiKey: 'test-api-key',
        isDefault: true,
        isPractice: false
      }
    ]
  }

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

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any)
    
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any)
    ;(mockPrisma.position.upsert as jest.Mock).mockResolvedValue({ id: 'position-1' })
    ;(mockPrisma.position.findFirst as jest.Mock).mockResolvedValue({ id: 'position-1' })
    ;(mockPrisma.aIRecommendation.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(mockPrisma.aIRecommendation.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({
      id: 'rec-1',
      symbol: data.symbol,
      recommendationType: data.recommendationType,
      confidence: data.confidence,
      reasoning: data.reasoning,
      suggestedAction: data.suggestedAction,
      riskLevel: data.riskLevel,
      timeframe: data.timeframe
    }))
    ;(mockPrisma.aIAnalysisLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' })
    
    const mockAPIInstance = {
      getPositions: jest.fn().mockResolvedValue(mockPositions),
      getAccountInfo: jest.fn().mockResolvedValue({
        currencyCode: 'USD',
        cash: 10000
      }),
      getAccount: jest.fn().mockResolvedValue({
        currencyCode: 'USD',
        cash: 10000
      })
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    ;(mockAiAnalysisService.analyzeBulkPositions as jest.Mock).mockResolvedValue([mockAnalysis])
  })

  it('should analyze positions and return recommendations', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(200)
    expect(_data).toEqual({
      message: 'AI analysis completed successfully',
      recommendations: expect.arrayContaining([
        expect.objectContaining({
          symbol: 'AAPL'
        })
      ]),
      analysisLog: expect.any(Object),
      executionTime: expect.any(Number)
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockGetServerSession.mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'account-1' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(401)
    expect(_data).toEqual({
      error: 'Unauthorized'
    })
  })

  it('should return 400 for user without Trading212 accounts', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ trading212Accounts: [] })
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(400)
    expect(_data).toEqual({
      error: 'No active Trading212 accounts found'
    })
  })


  it('should handle Trading212 API errors', async () => {
    const mockAPIInstance = {
      getPositions: jest.fn().mockRejectedValue(new Error('API Error')),
      getAccountInfo: jest.fn().mockResolvedValue({ currencyCode: 'USD' }),
      getAccount: jest.fn().mockResolvedValue({ currencyCode: 'USD' })
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(500)
    expect(_data).toEqual({
      error: 'Failed to analyze positions'
    })
  })

  it('should handle AI analysis service errors', async () => {
    ;(mockAiAnalysisService.analyzeBulkPositions as jest.Mock).mockRejectedValue(new Error('AI Service Error'))
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(500)
    expect(_data).toEqual({
      error: 'Failed to analyze positions'
    })
  })

  it('should use default account when no accountId provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({})
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(200)
    expect(mockAiAnalysisService.analyzeBulkPositions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: 'AAPL'
        })
      ]),
      expect.any(Array),
      'MODERATE'
    )
  })

  it('should handle empty positions array', async () => {
    const mockAPIInstance = {
      getPositions: jest.fn().mockResolvedValue([]),
      getAccountInfo: jest.fn().mockResolvedValue({ currencyCode: 'USD' }),
      getAccount: jest.fn().mockResolvedValue({ currencyCode: 'USD' })
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(200)
    expect(_data).toEqual({
      message: 'No positions found to analyze',
      recommendations: [],
      analysisLog: null
    })
  })

  it('should handle invalid JSON in request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: 'invalid json'
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(500)
    expect(_data).toEqual({
      error: 'Failed to analyze positions'
    })
  })

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST'
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(200)
    expect(_data).toEqual({
      message: 'AI analysis completed successfully',
      recommendations: expect.any(Array),
      analysisLog: expect.any(Object),
      executionTime: expect.any(Number)
    })
  })

  it('should apply currency conversion correctly', async () => {
    const gbpPositions = [
      {
        ticker: 'RRl_EQ',
        quantity: 100,
        averagePrice: 1000, // in pence
        currentPrice: 1100, // in pence
        ppl: 100,
        pplPercent: 10,
        marketValue: 110000, // in pence
        maxBuy: 100000,
        maxSell: 100000,
        accountName: 'GBP Account',
        accountId: 'account-1',
        isPractice: false
      }
    ]

    const mockAPIInstance = {
      getPositions: jest.fn().mockResolvedValue(gbpPositions),
      getAccountInfo: jest.fn().mockResolvedValue({ currencyCode: 'GBP' }),
      getAccount: jest.fn().mockResolvedValue({ currencyCode: 'GBP' })
    }
    mockTrading212API.mockImplementation(() => mockAPIInstance as any)
    
    // Mock the AI service to return a recommendation for RRl_EQ
    ;(mockAiAnalysisService.analyzeBulkPositions as jest.Mock).mockResolvedValue([{
      recommendationType: 'HOLD',
      confidence: 0.8,
      reasoning: 'Strong fundamentals',
      suggestedAction: 'Hold position',
      riskLevel: 'MEDIUM',
      timeframe: 'MEDIUM'
    }])
    
    const request = new NextRequest('http://localhost:3000/api/ai/analyze-positions', {
      method: 'POST',
      body: JSON.stringify({ analysisType: 'DAILY_REVIEW' })
    })
    
    const response = await POST(request)
    const _data = await response.json()
    
    expect(response.status).toBe(200)
    expect(_data.recommendations[0]).toEqual(
      expect.objectContaining({
        symbol: 'RRl_EQ'
      })
    )
  })
})
