import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, retryDatabaseOperation } from "@/lib/prisma";
import { optimizedTrading212Service } from "@/lib/optimized-trading212";
import {
  optimizedAIService,
  PositionData,
  MarketData,
  BatchAnalysisRequest,
} from "@/lib/optimized-ai-service";
import logger from "@/lib/logger";
import { dedupeLatestBy } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      analysisType = "BATCH_ANALYSIS",
      accountId,
      forceRefresh = false,
    } = await request.json();

    const startTime = Date.now();

    logger.info(
      `🤖 Optimized AI Analysis: ${analysisType} for account ${accountId || "all"}`,
    );

    // Get user's Trading212 accounts
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          trading212Accounts: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              apiKey: true,
              isPractice: true,
              isDefault: true,
            },
          },
        },
      }),
    );

    if (!user?.trading212Accounts || user.trading212Accounts.length === 0) {
      return NextResponse.json(
        { error: "No active Trading212 accounts found" },
        { status: 400 },
      );
    }

    // Determine which accounts to analyze
    let accountsToAnalyze = [];
    if (accountId) {
      const targetAccount = user.trading212Accounts.find(
        (acc) => acc.id === accountId,
      );
      if (!targetAccount) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 },
        );
      }
      accountsToAnalyze = [targetAccount];
    } else {
      accountsToAnalyze = user.trading212Accounts;
    }

    if (accountsToAnalyze.length === 0) {
      return NextResponse.json(
        { error: "No accounts to analyze" },
        { status: 400 },
      );
    }

    // Collect all positions from all accounts
    const allPositions: PositionData[] = [];
    const allMarketData: MarketData[] = [];
    const accountPositions = new Map<string, PositionData[]>();

    for (const account of accountsToAnalyze) {
      try {
        // Check rate limiting
        if (
          !optimizedTrading212Service.canMakeRequest(
            session.user.id,
            account.id,
          )
        ) {
          logger.info(`⏳ Rate limited for account ${account.id}, skipping`);
          continue;
        }

        // Get portfolio data (with caching)
        const portfolioData = forceRefresh
          ? await optimizedTrading212Service.forceRefreshAccountData(
              session.user.id,
              account.id,
              account.apiKey,
              account.isPractice,
            )
          : await optimizedTrading212Service.getAccountData(
              session.user.id,
              account.id,
              account.apiKey,
              account.isPractice,
            );

        const positions = portfolioData.portfolio.map((pos) => ({
          symbol: pos.ticker,
          quantity: pos.quantity,
          currentPrice: pos.currentPrice,
          pnl: pos.ppl || 0,
          pnlPercent: pos.pplPercent || 0,
          averagePrice: pos.averagePrice,
        }));

        allPositions.push(...positions);
        accountPositions.set(account.id, positions);

        // Generate mock market data (in real implementation, this would come from market data API)
        const marketData = positions.map((pos) => ({
          symbol: pos.symbol,
          price: pos.currentPrice,
          change: 0, // Would be calculated from market data
          changePercent: 0,
          volume: 1000000, // Mock volume
        }));

        allMarketData.push(...marketData);

        logger.info(
          `📊 Collected ${positions.length} positions from account ${account.name}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to fetch data for account ${account.name}:`,
          error,
        );
        continue;
      }
    }

    if (allPositions.length === 0) {
      return NextResponse.json({
        recommendations: [],
        summary: {
          totalPositions: 0,
          accountsAnalyzed: 0,
          executionTime: Date.now() - startTime,
          cacheHits: 0,
        },
        accountInfo: null,
      });
    }

    logger.info(
      `🎯 Starting batch AI analysis for ${allPositions.length} positions`,
    );

    // Perform batch AI analysis
    const batchRequest: BatchAnalysisRequest = {
      positions: allPositions,
      marketData: allMarketData,
      userId: session.user.id,
      accountId: accountId || "aggregated",
      riskProfile: "MODERATE", // Could be made configurable
    };

    const analysisResult =
      await optimizedAIService.analyzePositionsBatch(batchRequest);

    // Save recommendations to database
    const savedRecommendations = [];
    for (const [accountId, positions] of accountPositions.entries()) {
      const account = accountsToAnalyze.find((acc) => acc.id === accountId);
      if (!account) continue;

      const accountRecommendations = analysisResult.recommendations.filter(
        (_, index) => {
          const startIndex = allPositions.findIndex(
            (p) => p.symbol === positions[0]?.symbol,
          );
          return index >= startIndex && index < startIndex + positions.length;
        },
      );

      for (const [index, recommendation] of accountRecommendations.entries()) {
        const position = positions[index];
        if (!position) continue;

        try {
          // Find the corresponding database position
          const dbPosition = await retryDatabaseOperation(() =>
            prisma.position.findFirst({
              where: {
                userId: session.user.id,
                symbol: position.symbol,
              },
            }),
          );

          if (!dbPosition) {
            logger.info(
              `⚠️ Database position not found for ${position.symbol} in account ${account.id}`,
            );
            continue;
          }

          // Deactivate previous active recommendations for this position to avoid duplicates
          await retryDatabaseOperation(() =>
            prisma.aIRecommendation.updateMany({
              where: {
                userId: session.user.id,
                positionId: dbPosition.id,
                isActive: true,
              },
              data: { isActive: false },
            }),
          );

          // Save recommendation
          const savedRec = await retryDatabaseOperation(() =>
            prisma.aIRecommendation.create({
              data: {
                userId: session.user.id,
                positionId: dbPosition.id,
                symbol: position.symbol,
                recommendationType: recommendation.recommendationType,
                confidence: recommendation.confidence,
                reasoning: recommendation.reasoning,
                suggestedAction: recommendation.suggestedAction,
                targetPrice: recommendation.targetPrice,
                stopLoss: recommendation.stopLoss,
                riskLevel: recommendation.riskLevel,
                timeframe: recommendation.timeframe,
                userFeedback: JSON.stringify({
                  accountId: account.id,
                  accountName: account.name,
                  isPractice: account.isPractice,
                  batchAnalysis: true,
                  cacheKey: recommendation.cacheKey,
                }),
              },
            }),
          );

          savedRecommendations.push({
            ...savedRec,
            accountInfo: {
              name: account.name,
              isPractice: account.isPractice,
              isDefault: account.isDefault,
            },
          });
        } catch (error) {
          console.error(
            `❌ Failed to save recommendation for ${position.symbol}:`,
            error,
          );
        }
      }
    }

    const executionTime = Date.now() - startTime;

    logger.info(
      `✅ Optimized AI Analysis Complete: ${savedRecommendations.length} recommendations saved, ${analysisResult.cacheHits} cache hits, ${executionTime}ms`,
    );

    return NextResponse.json({
      recommendations: savedRecommendations,
      summary: {
        totalPositions: allPositions.length,
        accountsAnalyzed: accountsToAnalyze.length,
        recommendationsGenerated: analysisResult.recommendations.length,
        recommendationsSaved: savedRecommendations.length,
        executionTime,
        cacheHits: analysisResult.cacheHits,
        totalTokens: analysisResult.totalTokens,
      },
      accountInfo: accountId
        ? {
            id: accountsToAnalyze[0].id,
            name: accountsToAnalyze[0].name,
            isPractice: accountsToAnalyze[0].isPractice,
          }
        : {
            totalAccounts: accountsToAnalyze.length,
            accountNames: accountsToAnalyze.map((acc) => acc.name),
          },
    });
  } catch (error) {
    console.error("Optimized AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to perform AI analysis" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Reuse the existing GET logic from the original route
  // This would be the same as the original implementation
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    // Get recent recommendations (same logic as original)
    let recommendations = await retryDatabaseOperation(() =>
      prisma.aIRecommendation.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        include: {
          position: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );

    // Filter recommendations by account if specific account is selected
    if (accountId && recommendations.length > 0) {
      recommendations = recommendations.filter((rec) => {
        try {
          if (rec.userFeedback) {
            const accountInfo = JSON.parse(rec.userFeedback);
            return accountInfo.accountId === accountId;
          }
          return false;
        } catch {
          return false;
        }
      });
    }

    // Dedupe by symbol, keeping the latest by createdAt, then sort desc by createdAt
    const dedupedRecommendations = dedupeLatestBy(
      recommendations,
      (r) => r.symbol,
      (r) => r.createdAt,
    );

    const processedRecommendations = dedupedRecommendations.map((rec) => {
      let accountInfo = null;
      try {
        if (rec.userFeedback) {
          const parsed = JSON.parse(rec.userFeedback);
          accountInfo = {
            name: parsed.accountName,
            isPractice: parsed.isPractice,
            isDefault: parsed.isDefault,
          };
        }
      } catch (error) {
        console.error("Error parsing userFeedback:", error);
      }

      return {
        ...rec,
        accountInfo,
      };
    });

    return NextResponse.json({
      recommendations: processedRecommendations,
      accountInfo: accountId
        ? {
            id: accountId,
            name: "Account",
          }
        : null,
    });
  } catch (error) {
    console.error("Get optimized AI recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}
