import OpenAI from "openai";
import { prisma } from "./prisma";

export interface PositionData {
  symbol: string;
  quantity: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  averagePrice: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface AIRecommendationResult {
  recommendationType: "HOLD" | "SELL" | "BUY_MORE" | "EXIT";
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  targetPrice?: number;
  stopLoss?: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  timeframe: "SHORT" | "MEDIUM" | "LONG";
  cacheKey?: string;
}

export interface BatchAnalysisRequest {
  positions: PositionData[];
  marketData: MarketData[];
  userId: string;
  accountId: string;
  riskProfile: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
}

export interface BatchAnalysisResult {
  recommendations: AIRecommendationResult[];
  totalTokens: number;
  cacheHits: number;
  executionTime: number;
}

export class OptimizedAIService {
  private openai: OpenAI | null = null;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for AI recommendations
  private readonly BATCH_SIZE = 5; // Process 5 positions at once
  private readonly MAX_TOKENS_PER_REQUEST = 4000;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private generateCacheKey(
    position: PositionData,
    riskProfile: string,
  ): string {
    return `ai_analysis_${position.symbol}_${position.quantity}_${position.currentPrice}_${position.pnlPercent}_${riskProfile}`;
  }

  private async getCachedRecommendation(
    cacheKey: string,
  ): Promise<AIRecommendationResult | null> {
    try {
      // Check database cache first
      const cached = await prisma.aIRecommendation.findFirst({
        where: {
          symbol: cacheKey.split("_")[2], // Extract symbol from cache key
          userFeedback: {
            contains: cacheKey,
          },
          createdAt: {
            gte: new Date(Date.now() - this.CACHE_TTL),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (cached) {
        console.log(`🎯 AI Cache HIT for ${cacheKey}`);
        return {
          recommendationType: cached.recommendationType as
            | "HOLD"
            | "SELL"
            | "BUY_MORE"
            | "EXIT",
          confidence: cached.confidence,
          reasoning: cached.reasoning,
          suggestedAction: cached.suggestedAction,
          targetPrice: cached.targetPrice || undefined,
          stopLoss: cached.stopLoss || undefined,
          riskLevel: cached.riskLevel as "LOW" | "MEDIUM" | "HIGH",
          timeframe: cached.timeframe as "SHORT" | "MEDIUM" | "LONG",
          cacheKey,
        };
      }

      return null;
    } catch (error) {
      console.error("Error checking AI cache:", error);
      return null;
    }
  }

  private async analyzePositionBatch(
    positions: PositionData[],
    marketData: MarketData[],
    riskProfile: string,
  ): Promise<AIRecommendationResult[]> {
    if (!this.openai) {
      return this.ruleBasedBatchAnalysis(positions, marketData, riskProfile);
    }

    try {
      // Build batch prompt
      const batchPrompt = this.buildBatchAnalysisPrompt(
        positions,
        marketData,
        riskProfile,
      );

      console.log(`🤖 AI Batch Analysis: ${positions.length} positions`);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert financial advisor specializing in portfolio analysis and exit strategies. 
            Analyze the provided positions and provide concise, actionable recommendations for each.
            Focus on risk management, profit-taking opportunities, and position sizing.
            Respond with a JSON array of recommendations.`,
          },
          {
            role: "user",
            content: batchPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: this.MAX_TOKENS_PER_REQUEST,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from AI service");
      }

      return this.parseBatchAIResponse(response, positions);
    } catch (error) {
      console.error("AI batch analysis failed:", error);
      return this.ruleBasedBatchAnalysis(positions, marketData, riskProfile);
    }
  }

  private buildBatchAnalysisPrompt(
    positions: PositionData[],
    marketData: MarketData[],
    riskProfile: string,
  ): string {
    const positionsText = positions
      .map((pos, index) => {
        const market = marketData.find((m) => m.symbol === pos.symbol);
        return `
Position ${index + 1}:
- Symbol: ${pos.symbol}
- Quantity: ${pos.quantity}
- Current Price: $${pos.currentPrice}
- Average Price: $${pos.averagePrice}
- P&L: $${pos.pnl} (${pos.pnlPercent.toFixed(2)}%)
- Market Data: ${market ? `Price: $${market.price}, Change: ${market.changePercent.toFixed(2)}%` : "N/A"}
`;
      })
      .join("\n");

    return `
Analyze the following portfolio positions for a ${riskProfile} risk profile investor:

${positionsText}

For each position, provide:
1. Recommendation: HOLD, SELL, BUY_MORE, or EXIT
2. Confidence: 0.0 to 1.0
3. Reasoning: Brief explanation
4. Suggested Action: Specific action to take
5. Target Price: If applicable
6. Stop Loss: If applicable
7. Risk Level: LOW, MEDIUM, or HIGH
8. Timeframe: SHORT, MEDIUM, or LONG

Respond with JSON array format:
[
  {
    "symbol": "SYMBOL",
    "recommendationType": "HOLD|SELL|BUY_MORE|EXIT",
    "confidence": 0.85,
    "reasoning": "Brief reasoning",
    "suggestedAction": "Specific action",
    "targetPrice": 150.00,
    "stopLoss": 140.00,
    "riskLevel": "LOW|MEDIUM|HIGH",
    "timeframe": "SHORT|MEDIUM|LONG"
  }
]
`;
  }

  private parseBatchAIResponse(
    response: string,
    positions: PositionData[],
  ): AIRecommendationResult[] {
    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      return parsed.map((item, index) => ({
        recommendationType: item.recommendationType || "HOLD",
        confidence: Math.min(Math.max(item.confidence || 0.5, 0), 1),
        reasoning: item.reasoning || "AI analysis completed",
        suggestedAction: item.suggestedAction || "Monitor position",
        targetPrice: item.targetPrice || undefined,
        stopLoss: item.stopLoss || undefined,
        riskLevel: item.riskLevel || "MEDIUM",
        timeframe: item.timeframe || "MEDIUM",
        cacheKey: this.generateCacheKey(positions[index], "MODERATE"),
      }));
    } catch (error) {
      console.error("Failed to parse AI batch response:", error);
      return this.ruleBasedBatchAnalysis(positions, [], "MODERATE");
    }
  }

  private ruleBasedBatchAnalysis(
    positions: PositionData[],
    marketData: MarketData[],
    riskProfile: string,
  ): AIRecommendationResult[] {
    return positions.map((position) => {
      // const market = marketData.find(m => m.symbol === position.symbol)
      // const isProfit = position.pnl > 0
      const isSignificantProfit = position.pnlPercent > 20;
      const isSignificantLoss = position.pnlPercent < -15;

      let recommendationType: "HOLD" | "SELL" | "BUY_MORE" | "EXIT" = "HOLD";
      let confidence = 0.6;
      let reasoning = "Position performing within normal range";
      let suggestedAction = "Continue monitoring";
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

      if (isSignificantProfit) {
        recommendationType = "SELL";
        confidence = 0.8;
        reasoning = "Significant profit achieved, consider taking profits";
        suggestedAction = "Consider partial profit taking";
      } else if (isSignificantLoss) {
        recommendationType = "EXIT";
        confidence = 0.7;
        reasoning = "Significant loss, consider cutting losses";
        suggestedAction = "Review position and consider exit";
        riskLevel = "HIGH";
      }

      return {
        recommendationType,
        confidence,
        reasoning,
        suggestedAction,
        riskLevel,
        timeframe: "MEDIUM" as const,
        cacheKey: this.generateCacheKey(position, riskProfile),
      };
    });
  }

  async analyzePositionsBatch(
    request: BatchAnalysisRequest,
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    const totalTokens = 0;

    console.log(
      `🎯 Batch AI Analysis: ${request.positions.length} positions for account ${request.accountId}`,
    );

    // Check cache for each position
    const uncachedPositions: PositionData[] = [];
    const cachedRecommendations: AIRecommendationResult[] = [];

    for (const position of request.positions) {
      const cacheKey = this.generateCacheKey(position, request.riskProfile);
      const cached = await this.getCachedRecommendation(cacheKey);

      if (cached) {
        cachedRecommendations.push(cached);
        cacheHits++;
      } else {
        uncachedPositions.push(position);
      }
    }

    // Analyze uncached positions in batches
    const allRecommendations = [...cachedRecommendations];

    if (uncachedPositions.length > 0) {
      const batches = this.chunkArray(uncachedPositions, this.BATCH_SIZE);

      for (const batch of batches) {
        const batchMarketData = request.marketData.filter((m) =>
          batch.some((p) => p.symbol === m.symbol),
        );

        const batchRecommendations = await this.analyzePositionBatch(
          batch,
          batchMarketData,
          request.riskProfile,
        );

        allRecommendations.push(...batchRecommendations);
      }
    }

    const executionTime = Date.now() - startTime;

    console.log(
      `✅ Batch Analysis Complete: ${allRecommendations.length} recommendations, ${cacheHits} cache hits, ${executionTime}ms`,
    );

    return {
      recommendations: allRecommendations,
      totalTokens,
      cacheHits,
      executionTime,
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async clearCache(userId?: string, accountId?: string): Promise<void> {
    try {
      const whereClause: Record<string, unknown> = {};
      if (userId) whereClause.userId = userId;
      if (accountId) whereClause.userFeedback = { contains: accountId };

      await prisma.aIRecommendation.deleteMany({
        where: whereClause,
      });

      console.log(
        `🗑️ AI Cache cleared for user: ${userId}, account: ${accountId}`,
      );
    } catch (error) {
      console.error("Error clearing AI cache:", error);
    }
  }

  getStats(): { hasOpenAI: boolean; cacheTTL: number; batchSize: number } {
    return {
      hasOpenAI: !!this.openai,
      cacheTTL: this.CACHE_TTL,
      batchSize: this.BATCH_SIZE,
    };
  }
}

// Global optimized AI service instance
export const optimizedAIService = new OptimizedAIService();
