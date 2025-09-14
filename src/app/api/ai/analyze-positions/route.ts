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

    const { analysisType = 'DAILY_REVIEW', accountId } = await request.json()

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

    let allRecommendations = []
    let totalExecutionTime = 0

    // Determine which accounts to analyze
    let accountsToAnalyze = []
    if (accountId) {
      // Single account analysis
      const targetAccount = user.trading212Accounts.find(acc => acc.id === accountId)
      if (!targetAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      accountsToAnalyze = [targetAccount]
    } else {
      // Aggregated analysis - use all accounts (they are already filtered by isActive in the query)
      accountsToAnalyze = user.trading212Accounts
    }

    if (accountsToAnalyze.length === 0) {
      return NextResponse.json({
        message: 'No active accounts found to analyze',
        recommendations: [],
        analysisLog: null,
        accountInfo: null
      })
    }

    // Process each account
    for (const targetAccount of accountsToAnalyze) {
      const accountStartTime = Date.now()
      
      // Fetch current positions from Trading212
      const trading212 = new Trading212API(targetAccount.apiKey, targetAccount.isPractice)
      const trading212Positions = await trading212.getPositions()

      if (trading212Positions.length === 0) {
        continue // Skip accounts with no positions
      }

      // Get account info to determine currency conversion factor
      const accountInfo = await trading212.getAccount().catch(() => null)
      
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
              pnlPercent: position.pnlPercent,
              averagePrice: position.averagePrice
            },
            accountInfo: {
              name: targetAccount.name,
              isPractice: targetAccount.isPractice,
              isDefault: targetAccount.isDefault
            }
          })
        }
      }

      // Add account recommendations to the total
      allRecommendations.push(...savedRecommendations)
      totalExecutionTime += Date.now() - accountStartTime
    }

    const executionTime = Date.now() - startTime

    // Log the analysis
    const analysisLog = await retryDatabaseOperation(() =>
      prisma.aIAnalysisLog.create({
        data: {
          userId: session.user.id,
          analysisType,
          totalPositions: allRecommendations.length,
          recommendations: allRecommendations.length,
          executionTime,
          success: true
        }
      })
    )

    // Determine response account info
    let responseAccountInfo = null
    if (accountsToAnalyze.length === 1) {
      // Single account
      responseAccountInfo = {
        name: accountsToAnalyze[0].name,
        isPractice: accountsToAnalyze[0].isPractice,
        isDefault: accountsToAnalyze[0].isDefault
      }
    } else {
      // Aggregated view
      responseAccountInfo = {
        name: `${accountsToAnalyze.length} Accounts (${accountsToAnalyze.map(acc => acc.name).join(', ')})`,
        isPractice: false, // Mixed accounts
        isDefault: false,
        isAggregated: true
      }
    }

    return NextResponse.json({
      message: 'AI analysis completed successfully',
      recommendations: allRecommendations,
      analysisLog,
      executionTime,
      accountInfo: responseAccountInfo
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    // Get user's accounts
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
              isPractice: true,
              isDefault: true
            }
          }
        }
      })
    )

    if (!user?.trading212Accounts || user.trading212Accounts.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        accountInfo: null
      })
    }

    // Determine which accounts to get recommendations for
    let targetAccounts = []
    if (accountId) {
      // Single account
      const targetAccount = user.trading212Accounts.find(acc => acc.id === accountId)
      if (!targetAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      targetAccounts = [targetAccount]
    } else {
      // All accounts (aggregated view)
      targetAccounts = user.trading212Accounts
    }

    // Get recent recommendations - for now we get all and filter client-side
    // In a real implementation, you might want to store account info with recommendations
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
        take: 50 // Get more to allow for filtering
      })
    )

    // Determine response account info
    let responseAccountInfo = null
    if (targetAccounts.length === 1) {
      // Single account
      responseAccountInfo = {
        name: targetAccounts[0].name,
        isPractice: targetAccounts[0].isPractice,
        isDefault: targetAccounts[0].isDefault
      }
    } else {
      // Aggregated view
      responseAccountInfo = {
        name: `${targetAccounts.length} Accounts (${targetAccounts.map(acc => acc.name).join(', ')})`,
        isPractice: false, // Mixed accounts
        isDefault: false,
        isAggregated: true
      }
    }

    // Debug logging for recommendations
    console.log('🔍 AI Recommendations from DB:', recommendations.map(rec => ({
      symbol: rec.symbol,
      pnlPercent: rec.position?.pnlPercent,
      averagePrice: rec.position?.averagePrice,
      currentPrice: rec.position?.currentPrice,
      pnl: rec.position?.pnl,
      lastUpdated: rec.position?.lastUpdated
    })))

    return NextResponse.json({ 
      recommendations,
      accountInfo: responseAccountInfo
    })

  } catch (error) {
    console.error('Get AI recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}
