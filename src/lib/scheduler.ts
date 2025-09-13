import { prisma } from './prisma'
import { Trading212API } from './trading212'
import { aiAnalysisService, PositionData, MarketData } from './ai-service'

export class DailyAnalysisScheduler {
  private static instance: DailyAnalysisScheduler
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): DailyAnalysisScheduler {
    if (!DailyAnalysisScheduler.instance) {
      DailyAnalysisScheduler.instance = new DailyAnalysisScheduler()
    }
    return DailyAnalysisScheduler.instance
  }

  start() {
    if (this.isRunning) {
      console.log('Daily analysis scheduler is already running')
      return
    }

    this.isRunning = true
    console.log('Starting daily analysis scheduler...')

    // Run immediately on start
    this.runDailyAnalysis()

    // Schedule to run every 24 hours (at market close time - 4:00 PM EST)
    const now = new Date()
    const targetTime = new Date()
    targetTime.setHours(21, 0, 0, 0) // 9:00 PM UTC = 4:00 PM EST

    // If it's past the target time today, schedule for tomorrow
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1)
    }

    const timeUntilTarget = targetTime.getTime() - now.getTime()

    // Set initial timeout
    setTimeout(() => {
      this.runDailyAnalysis()
      
      // Then run every 24 hours
      this.intervalId = setInterval(() => {
        this.runDailyAnalysis()
      }, 24 * 60 * 60 * 1000) // 24 hours
    }, timeUntilTarget)

    console.log(`Next daily analysis scheduled for: ${targetTime.toISOString()}`)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Daily analysis scheduler stopped')
  }

  async runDailyAnalysis() {
    console.log('Running daily AI analysis for all users...')
    
    try {
      // Get all users with active Trading212 accounts
      const users = await prisma.user.findMany({
        where: {
          trading212Accounts: {
            some: {
              isActive: true
            }
          }
        },
        select: {
          id: true,
          email: true,
          trading212Accounts: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              apiKey: true,
              isPractice: true
            }
          }
        }
      })

      console.log(`Found ${users.length} users with active Trading212 accounts`)

      for (const user of users) {
        try {
          // Analyze positions for each active account
          for (const account of user.trading212Accounts) {
            await this.analyzeUserPositions(user.id, account.apiKey, account.isPractice)
          }
        } catch (error) {
          console.error(`Failed to analyze positions for user ${user.id}:`, error)
          
          // Log the error
          await prisma.aIAnalysisLog.create({
            data: {
              userId: user.id,
              analysisType: 'DAILY_REVIEW',
              totalPositions: 0,
              recommendations: 0,
              executionTime: 0,
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          })
        }

        // Add delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

      console.log('Daily AI analysis completed for all users')
    } catch (error) {
      console.error('Failed to run daily analysis:', error)
    }
  }

  private async analyzeUserPositions(userId: string, apiKey: string, isPractice: boolean = true) {
    const startTime = Date.now()
    
    try {
      // Fetch positions from Trading212
      const trading212 = new Trading212API(apiKey, isPractice)
      const trading212Positions = await trading212.getPositions()

      if (trading212Positions.length === 0) {
        console.log(`No positions found for user ${userId}`)
        return
      }

      // Optionally fetch account info (not used directly)
      await trading212.getAccount().catch(() => null)
      
      // Determine currency - Trading212 API doesn't always return currencyCode
      // Note: currency is inferred but not used directly; conversion handled per-position
      // Currency inference not used directly; conversion handled per-position
      
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
        if (pos.ticker === 'AIRp_EQ' || pos.ticker === 'RRl_EQ' || pos.ticker === 'NVDA_US_EQ' || pos.ticker === 'ISFl_EQ' || pos.ticker === 'QQQ3l_EQ') {
          console.log(`🔍 Scheduler ${pos.ticker}: isGBPStock=${isGBPStock}, isUSDStock=${isUSDStock}, conversionFactor=${conversionFactor}, rawValue=${pos.currentPrice}, convertedValue=${pos.currentPrice / conversionFactor}`)
        }
        
        const averagePrice = pos.averagePrice / conversionFactor
        const currentPrice = pos.currentPrice / conversionFactor
        const pnl = pos.ppl / conversionFactor
        
        // Calculate P/L % correctly: (currentPrice - averagePrice) / averagePrice * 100
        const pnlPercent = averagePrice !== 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0
        
        // Debug logging for P/L % calculation
        if (pos.ticker === 'AIRp_EQ' || pos.ticker === 'RRl_EQ' || pos.ticker === 'NVDA_US_EQ' || pos.ticker === 'ISFl_EQ' || pos.ticker === 'QQQ3l_EQ') {
          console.log(`💰 Scheduler P/L % Calculation ${pos.ticker}: avgPrice=${averagePrice.toFixed(2)}, currentPrice=${currentPrice.toFixed(2)}, pnlPercent=${pnlPercent.toFixed(2)}%`)
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
        await prisma.position.upsert({
          where: {
            userId_symbol: {
              userId: userId,
              symbol: position.symbol
            }
          },
          update: {
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent,
            marketValue: position.marketValue,
            lastUpdated: new Date()
          },
          create: {
            userId: userId,
            symbol: position.symbol,
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            pnl: position.pnl,
            pnlPercent: position.pnlPercent,
            marketValue: position.marketValue,
            lastUpdated: new Date()
          }
        })
      }

      // Get AI recommendations
      const aiRecommendations = await aiAnalysisService.analyzeBulkPositions(
        positions,
        marketData,
        'MODERATE' // Default risk profile
      )

      // Save recommendations to database
      let savedCount = 0
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i]
        const recommendation = aiRecommendations[i]

        // Find the position in database
        const dbPosition = await prisma.position.findFirst({
          where: {
            userId: userId,
            symbol: position.symbol
          }
        })

        if (dbPosition) {
          // Deactivate old recommendations
          await prisma.aIRecommendation.updateMany({
            where: {
              userId: userId,
              positionId: dbPosition.id,
              isActive: true
            },
            data: { isActive: false }
          })

          // Create new recommendation
          await prisma.aIRecommendation.create({
            data: {
              userId: userId,
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

          savedCount++
        }
      }

      const executionTime = Date.now() - startTime

      // Log successful analysis
      await prisma.aIAnalysisLog.create({
        data: {
          userId: userId,
          analysisType: 'DAILY_REVIEW',
          totalPositions: positions.length,
          recommendations: savedCount,
          executionTime,
          success: true
        }
      })

      console.log(`Daily analysis completed for user ${userId}: ${savedCount} recommendations in ${executionTime}ms`)

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      // Log failed analysis
      await prisma.aIAnalysisLog.create({
        data: {
          userId: userId,
          analysisType: 'DAILY_REVIEW',
          totalPositions: 0,
          recommendations: 0,
          executionTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  // Method to trigger analysis for a specific user (for testing)
  async analyzeUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        trading212Accounts: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            apiKey: true,
            isPractice: true
          }
        }
      }
    })

    if (!user?.trading212Accounts || user.trading212Accounts.length === 0) {
      throw new Error('User does not have active Trading212 accounts')
    }

    // Analyze positions for the first active account (could be modified to analyze all)
    const account = user.trading212Accounts[0]
    return this.analyzeUserPositions(userId, account.apiKey, account.isPractice)
  }
}

// Export singleton instance
export const dailyScheduler = DailyAnalysisScheduler.getInstance()

// Auto-start scheduler in production (but not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_BUILD) {
  // Only start in server environment, not during build
  setTimeout(() => {
    dailyScheduler.start()
  }, 1000)
}
