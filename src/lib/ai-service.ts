import OpenAI from 'openai'

// Types for AI analysis
export interface PositionData {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  marketValue: number
}

export interface MarketData {
  symbol: string
  price: number
  volume: number
  change: number
  changePercent: number
  high52Week: number
  low52Week: number
  marketCap?: number
  pe?: number
  beta?: number
}

export interface AIRecommendationResult {
  recommendationType: 'EXIT' | 'HOLD' | 'REDUCE' | 'INCREASE'
  confidence: number
  reasoning: string
  suggestedAction: string
  targetPrice?: number
  stopLoss?: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG'
}

class AIAnalysisService {
  private openai: OpenAI | null = null

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    }
  }

  async analyzePosition(
    position: PositionData,
    marketData: MarketData,
    userRiskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE'
  ): Promise<AIRecommendationResult> {
    if (!this.openai) {
      // Fallback to rule-based analysis if OpenAI is not available
      return this.ruleBasedAnalysis(position, marketData, userRiskProfile)
    }

    try {
      const prompt = this.buildAnalysisPrompt(position, marketData, userRiskProfile)
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert financial advisor specializing in exit strategies for stock positions. Provide detailed, actionable recommendations based on technical and fundamental analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI service')
      }

      return this.parseAIResponse(response)
    } catch (error) {
      console.error('AI analysis failed:', error)
      // Fallback to rule-based analysis
      return this.ruleBasedAnalysis(position, marketData, userRiskProfile)
    }
  }

  private buildAnalysisPrompt(
    position: PositionData,
    marketData: MarketData,
    riskProfile: string
  ): string {
    return `
Analyze this stock position and provide an exit strategy recommendation:

POSITION DETAILS:
- Symbol: ${position.symbol}
- Quantity: ${position.quantity}
- Average Price: $${position.averagePrice}
- Current Price: $${position.currentPrice}
- P/L: $${position.pnl} (${position.pnlPercent}%)
- Market Value: $${position.marketValue}

MARKET DATA:
- Current Price: $${marketData.price}
- Daily Change: ${marketData.changePercent}%
- Volume: ${marketData.volume}
- 52-Week High: $${marketData.high52Week}
- 52-Week Low: $${marketData.low52Week}
${marketData.pe ? `- P/E Ratio: ${marketData.pe}` : ''}
${marketData.beta ? `- Beta: ${marketData.beta}` : ''}

RISK PROFILE: ${riskProfile}

Please provide your response in this exact JSON format:
{
  "recommendationType": "EXIT|HOLD|REDUCE|INCREASE",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of your analysis and reasoning",
  "suggestedAction": "Specific actionable steps the user should take",
  "targetPrice": 150.00,
  "stopLoss": 140.00,
  "riskLevel": "LOW|MEDIUM|HIGH",
  "timeframe": "SHORT|MEDIUM|LONG"
}

Consider:
- Technical indicators and price trends
- Risk-reward ratio
- Position sizing relative to portfolio
- Market conditions and volatility
- User's risk profile
`
  }

  private parseAIResponse(response: string): AIRecommendationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        recommendationType: parsed.recommendationType || 'HOLD',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        reasoning: parsed.reasoning || 'Analysis completed',
        suggestedAction: parsed.suggestedAction || 'Monitor position',
        targetPrice: parsed.targetPrice || undefined,
        stopLoss: parsed.stopLoss || undefined,
        riskLevel: parsed.riskLevel || 'MEDIUM',
        timeframe: parsed.timeframe || 'MEDIUM'
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      // Return default recommendation
      return {
        recommendationType: 'HOLD',
        confidence: 0.5,
        reasoning: 'Unable to parse AI recommendation. Please review manually.',
        suggestedAction: 'Monitor position and consider market conditions.',
        riskLevel: 'MEDIUM',
        timeframe: 'MEDIUM'
      }
    }
  }

  private ruleBasedAnalysis(
    position: PositionData,
    marketData: MarketData,
    riskProfile: string
  ): AIRecommendationResult {
    const pnlPercent = position.pnlPercent
    const priceFromHigh = ((marketData.high52Week - marketData.price) / marketData.high52Week) * 100
    const priceFromLow = ((marketData.price - marketData.low52Week) / marketData.low52Week) * 100

    // Rule-based logic
    let recommendationType: AIRecommendationResult['recommendationType'] = 'HOLD'
    let confidence = 0.6
    let reasoning = ''
    let suggestedAction = ''
    let riskLevel: AIRecommendationResult['riskLevel'] = 'MEDIUM'
    const timeframe: AIRecommendationResult['timeframe'] = 'MEDIUM'

    // Exit conditions
    if (pnlPercent > 20 && priceFromHigh < 10) {
      recommendationType = 'EXIT'
      confidence = 0.8
      reasoning = 'Strong gains achieved and price near 52-week high. Consider taking profits.'
      suggestedAction = 'Sell position to lock in profits. Consider setting trailing stop if holding.'
      riskLevel = 'LOW'
    } else if (pnlPercent < -15) {
      recommendationType = 'EXIT'
      confidence = 0.7
      reasoning = 'Significant losses accumulated. Consider cutting losses to preserve capital.'
      suggestedAction = 'Sell position to limit further losses. Reassess investment thesis.'
      riskLevel = 'HIGH'
    } else if (pnlPercent > 10 && riskProfile === 'CONSERVATIVE') {
      recommendationType = 'REDUCE'
      confidence = 0.7
      reasoning = 'Good profits achieved. Conservative profile suggests taking some profits.'
      suggestedAction = 'Sell 25-50% of position to reduce risk while maintaining upside exposure.'
      riskLevel = 'LOW'
    } else if (pnlPercent < -5 && priceFromLow > 50) {
      recommendationType = 'HOLD'
      confidence = 0.6
      reasoning = 'Minor losses but price well above 52-week low. Monitor for reversal.'
      suggestedAction = 'Hold position but set stop-loss at -10%. Monitor for trend changes.'
      riskLevel = 'MEDIUM'
    } else {
      recommendationType = 'HOLD'
      confidence = 0.5
      reasoning = 'Position within normal range. Continue monitoring market conditions.'
      suggestedAction = 'Maintain current position. Review regularly for changes in fundamentals.'
      riskLevel = 'MEDIUM'
    }

    return {
      recommendationType,
      confidence,
      reasoning,
      suggestedAction,
      targetPrice: recommendationType === 'EXIT' ? undefined : marketData.price * 1.1,
      stopLoss: marketData.price * 0.9,
      riskLevel,
      timeframe
    }
  }

  async analyzeBulkPositions(
    positions: PositionData[],
    marketData: MarketData[],
    riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE'
  ): Promise<AIRecommendationResult[]> {
    const results: AIRecommendationResult[] = []

    for (const position of positions) {
      const symbolMarketData = marketData.find(m => m.symbol === position.symbol)
      if (symbolMarketData) {
        const recommendation = await this.analyzePosition(position, symbolMarketData, riskProfile)
        results.push(recommendation)
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }
}

export { AIAnalysisService }
export const aiAnalysisService = new AIAnalysisService()
