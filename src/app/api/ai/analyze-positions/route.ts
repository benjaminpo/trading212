import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'
import { aiAnalysisService, PositionData, MarketData } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysisType = 'DAILY_REVIEW' } = await request.json()

    const startTime = Date.now()
    
    // Get user's Trading212 accounts
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          trading212Accounts: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              apiKey: true,
              isPractice: true,
              isDefault: true
            }
          }
        }
      })
    )

    if (!user?.trading212Accounts || user.trading212Accounts.length === 0) {
      return NextResponse.json(
        { error: 'No active Trading212 accounts found' },
        { status: 400 }
      )
    }

    // Use default account or first active account
    const targetAccount = user.trading212Accounts.find(acc => acc.isDefault) || 
                         user.trading212Accounts[0]

    // Fetch current positions from Trading212
    const trading212 = new Trading212API(targetAccount.apiKey, targetAccount.isPractice)
    const trading212Positions = await trading212.getPositions()

    if (trading212Positions.length === 0) {
      return NextResponse.json({
        message: 'No positions found to analyze',
        recommendations: [],
        analysisLog: null
      })
    }

    // Get account info to determine currency conversion factor
    const accountInfo = await trading212.getAccount().catch(() => null)
    
    // Determine currency - Trading212 API doesn't always return currencyCode
    // Note: currency is inferred but not used directly; conversion handled per-position
    // Currency inference not used directly; conversion handled per-position
    
    if (!accountInfo?.currencyCode) {
      // Determine currency based on account name or position data
      // Mixed currencies are handled per-position; no global assignment needed
    }
    
    // Convert to our position format with position-specific currency conversion
    const positions: PositionData[] = trading212Positions.map(pos => {
      // Determine position-specific currency and conversion factor
      // Check if this is a USD stock (e.g., NVDA_US_EQ, TSLA_US_EQ)
      const isUSDStock = pos.ticker.includes('_US_')
      const isGBPStock = pos.ticker.includes('_GB_') || 
                        pos.ticker.includes('_UK_') || 
                        pos.ticker.includes('_LON_') ||
                        (pos.ticker.includes('_EQ') && !pos.ticker.includes('_US_'))
      
      // Determine conversion factor based on position currency and value magnitude
      // Some positions are in pence (e.g., ISFl_EQ: 904.5 pence = £9.045)
      // Others are in pounds (e.g., RRl_EQ: 1123.5 pounds)
      let conversionFactor = 1
      if (isGBPStock) {
        // For GBP stocks, check if values are in pence or pounds
        // Based on the data patterns:
        // - Very large values (>1000) are in pence (e.g., RRl_EQ: 1123.5 pence = £11.235)
        // - Medium values (100-1000) need more careful analysis
        // - Small values (<100) are in pounds (e.g., AIRp_EQ: 194 pounds = £194)
        if (pos.currentPrice > 1000) {
          conversionFactor = 100 // Convert from pence to pounds
        } else if (pos.currentPrice > 100) {
          // For values between 100-1000, use a more sophisticated approach
          // Check if the value looks like it's already in pounds by examining the magnitude
          // Values around 200-500 are likely already in pounds (e.g., QQQ3l_EQ: 284.685)
          // Values around 800-1000 are likely in pence (e.g., ISFl_EQ: 904.5)
          if (pos.currentPrice > 800) {
            conversionFactor = 100 // High values in this range are likely pence
          } else {
            conversionFactor = 1 // Lower values in this range are likely pounds
          }
        } else {
          conversionFactor = 1 // Already in pounds
        }
      } else if (isUSDStock) {
        // USD stocks: no conversion needed (already in dollars)
        conversionFactor = 1
      } else {
        // Default: no conversion needed
        conversionFactor = 1
      }
      
      // Debug logging for conversion factors
      if (pos.ticker === 'AIRp_EQ' || pos.ticker === 'RRl_EQ' || pos.ticker === 'NVDA_US_EQ' || pos.ticker === 'ISFl_EQ' || pos.ticker === 'QQQ3l_EQ' || pos.ticker === 'GOOGL_US_EQ' || pos.ticker === 'SNII_US_EQ') {
        console.log(`🔍 AI Analysis ${pos.ticker}: isGBPStock=${isGBPStock}, isUSDStock=${isUSDStock}, conversionFactor=${conversionFactor}`)
        console.log(`🔍 Raw API values: avgPrice=${pos.averagePrice}, currentPrice=${pos.currentPrice}, pnl=${pos.ppl}`)
        console.log(`🔍 Converted values: avgPrice=${pos.averagePrice / conversionFactor}, currentPrice=${pos.currentPrice / conversionFactor}, pnl=${pos.ppl / conversionFactor}`)
      }
      
      const averagePrice = pos.averagePrice / conversionFactor
      const currentPrice = pos.currentPrice / conversionFactor
      const pnl = pos.ppl / conversionFactor
      
      // Calculate P/L % correctly: (currentPrice - averagePrice) / averagePrice * 100
      const pnlPercent = averagePrice !== 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0
      
      // Debug logging for P/L % calculation
      if (pos.ticker === 'AIRp_EQ' || pos.ticker === 'RRl_EQ' || pos.ticker === 'NVDA_US_EQ' || pos.ticker === 'ISFl_EQ' || pos.ticker === 'QQQ3l_EQ' || pos.ticker === 'GOOGL_US_EQ' || pos.ticker === 'SNII_US_EQ') {
        console.log(`💰 P/L % Calculation ${pos.ticker}: avgPrice=${averagePrice.toFixed(2)}, currentPrice=${currentPrice.toFixed(2)}, pnlPercent=${pnlPercent.toFixed(2)}%`)
        console.log(`💰 Calculation: (${currentPrice.toFixed(2)} - ${averagePrice.toFixed(2)}) / ${averagePrice.toFixed(2)} * 100 = ${((currentPrice - averagePrice) / averagePrice * 100).toFixed(2)}%`)
      }
      
      return {
        symbol: pos.ticker,
        quantity: pos.quantity,
        averagePrice,
        currentPrice,
        pnl,
        pnlPercent,
        marketValue: (pos.currentPrice * pos.quantity) / conversionFactor
      }
    })

    // Get or create market data (simplified for demo)
    const marketData: MarketData[] = positions.map(pos => ({
      symbol: pos.symbol,
      price: pos.currentPrice,
      volume: 1000000, // Mock data
      change: pos.pnl,
      changePercent: pos.pnlPercent,
      high52Week: pos.currentPrice * 1.3, // Mock data
      low52Week: pos.currentPrice * 0.7, // Mock data
    }))

    // Update positions in database
    for (const position of positions) {
      console.log(`💾 Updating position ${position.symbol}:`, {
        pnlPercent: position.pnlPercent,
        averagePrice: position.averagePrice,
        currentPrice: position.currentPrice,
        pnl: position.pnl
      })
      
      await retryDatabaseOperation(() =>
        prisma.position.upsert({
          where: {
            userId_symbol: {
              userId: session.user.id,
              symbol: position.symbol
            }
          },
          update: {
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent || 0,
            marketValue: position.marketValue,
            lastUpdated: new Date()
          },
          create: {
            userId: session.user.id,
            symbol: position.symbol,
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent || 0,
            marketValue: position.marketValue,
            lastUpdated: new Date()
          }
        })
      )
    }

    // Get AI recommendations
    const aiRecommendations = await aiAnalysisService.analyzeBulkPositions(
      positions,
      marketData,
      'MODERATE' // Default risk profile, could be user-configurable
    )

    // Save recommendations to database
    const savedRecommendations = []
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i]
      const recommendation = aiRecommendations[i]

      // Find the position in database
      const dbPosition = await retryDatabaseOperation(() =>
        prisma.position.findFirst({
          where: {
            userId: session.user.id,
            symbol: position.symbol
          }
        })
      )

      if (dbPosition) {
        // Deactivate old recommendations
        await retryDatabaseOperation(() =>
          prisma.aIRecommendation.updateMany({
            where: {
              userId: session.user.id,
              positionId: dbPosition.id,
              isActive: true
            },
            data: { isActive: false }
          })
        )

        // Create new recommendation
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
            }
          })
        )

        savedRecommendations.push({
          ...savedRec,
          position: {
            symbol: position.symbol,
            quantity: position.quantity,
            currentPrice: position.currentPrice,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent
          }
        })
      }
    }

    const executionTime = Date.now() - startTime

    // Log the analysis
    const analysisLog = await retryDatabaseOperation(() =>
      prisma.aIAnalysisLog.create({
        data: {
          userId: session.user.id,
          analysisType,
          totalPositions: positions.length,
          recommendations: savedRecommendations.length,
          executionTime,
          success: true
        }
      })
    )

    return NextResponse.json({
      message: 'AI analysis completed successfully',
      recommendations: savedRecommendations,
      analysisLog,
      executionTime
    })

  } catch (error) {
    console.error('AI analysis error:', error)
    
    // Log failed analysis
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        await retryDatabaseOperation(() =>
          prisma.aIAnalysisLog.create({
            data: {
              userId: session.user.id,
              analysisType: 'DAILY_REVIEW',
              totalPositions: 0,
              recommendations: 0,
              executionTime: 0,
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          })
        )
      }
    } catch (logError) {
      console.error('Failed to log analysis error:', logError)
    }

    return NextResponse.json(
      { error: 'Failed to analyze positions' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent recommendations
    const recommendations = await retryDatabaseOperation(() =>
      prisma.aIRecommendation.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        include: {
          position: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    )

    // Debug logging for recommendations
    console.log('🔍 AI Recommendations from DB:', recommendations.map(rec => ({
      symbol: rec.symbol,
      pnlPercent: rec.position?.pnlPercent,
      averagePrice: rec.position?.averagePrice,
      currentPrice: rec.position?.currentPrice,
      pnl: rec.position?.pnl,
      lastUpdated: rec.position?.lastUpdated
    })))

    return NextResponse.json({ recommendations })

  } catch (error) {
    console.error('Get AI recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}
