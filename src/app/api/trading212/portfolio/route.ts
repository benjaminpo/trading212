import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'
import { trading212RateLimiter } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get accountId from query params (optional)
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    // Get user with Trading212 accounts
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        trading212Accounts: {
          where: accountId ? { id: accountId } : { isActive: true },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the target account (specific account or default active account)
    let targetAccount = null
    if (accountId) {
      targetAccount = user.trading212Accounts.find(acc => acc.id === accountId)
      if (!targetAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
    } else {
      // Use default account or first active account
      targetAccount = user.trading212Accounts.find(acc => acc.isDefault) || 
                    user.trading212Accounts.find(acc => acc.isActive)
    }

    if (!targetAccount) {
      return NextResponse.json({ 
        error: 'No Trading212 accounts configured',
        connected: false,
        positions: []
      }, { status: 400 })
    }

    // Check rate limiting
    const rateLimitKey = `trading212-${session.user.id}-${targetAccount.id}`;
    if (!trading212RateLimiter.canMakeRequest(rateLimitKey)) {
      const timeUntilReset = trading212RateLimiter.getTimeUntilReset(rateLimitKey);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(timeUntilReset / 1000),
          connected: true,
          positions: []
        },
        { status: 429 }
      )
    }

    // Initialize Trading212 API with account's API key
    console.log(`🔍 Using Trading212 API key for account: ${targetAccount.name} (${targetAccount.id})`);
    const trading212 = new Trading212API(targetAccount.apiKey, targetAccount.isPractice)

    // Fetch account information to get currency
    const accountInfo = await trading212.getAccount().catch((error) => {
      console.error('Error fetching account info for portfolio:', error);
      return null; // Return null on error
    })

    console.log('🔍 Account info:', accountInfo);

    // Fetch portfolio positions
    const positions = await trading212.getPositions().catch((error) => {
      console.error('Error fetching positions for portfolio:', error);
      return []; // Return empty array on error
    })

    console.log('🔍 Raw positions data:', positions.slice(0, 2)); // Log first 2 positions for debugging

    // Determine currency - Trading212 API doesn't always return currencyCode
    // We'll determine it based on account name and position data
    let currency = 'USD' // Default fallback
    
    if (accountInfo?.currencyCode) {
      currency = accountInfo.currencyCode
    } else {
      // Determine currency based on account name or position data
      if (targetAccount.name.toLowerCase().includes('isa') || 
          targetAccount.name.toLowerCase().includes('stock')) {
        currency = 'GBP' // UK ISA accounts are typically in GBP
      } else if (positions.length > 0) {
        // Check if positions have GBP-denominated stocks
        const hasGBPStocks = positions.some(pos => 
          pos.ticker.includes('_GB_') || 
          pos.ticker.includes('_UK_') ||
          pos.ticker.includes('_LON_') ||
          (pos.ticker.includes('_EQ') && !pos.ticker.includes('_US_'))
        )
        const hasUSDStocks = positions.some(pos => 
          pos.ticker.includes('_US_')
        )
        
        if (hasGBPStocks && !hasUSDStocks) {
          currency = 'GBP'
        } else if (hasUSDStocks && !hasGBPStocks) {
          currency = 'USD'
        } else if (hasGBPStocks && hasUSDStocks) {
          // Mixed currencies - default to GBP for UK accounts
          currency = 'GBP'
        }
      }
    }
    
    console.log('🔍 Determined currency:', currency);
    console.log('🔍 Account name:', targetAccount.name);
    console.log('🔍 Position tickers:', positions.map(p => p.ticker).slice(0, 5));

    // Format positions for frontend
    const formattedPositions = positions.map(position => {
      // Calculate P/L percentage if not provided by API
      let pplPercent = position.pplPercent
      if (pplPercent == null || isNaN(pplPercent)) {
        // Calculate P/L percentage: (current price - average price) / average price * 100
        const investedValue = position.quantity * position.averagePrice
        pplPercent = investedValue > 0 ? (position.ppl / investedValue) * 100 : 0
      }
      
      // Determine position-specific currency and conversion factor
      // Check if this is a USD stock (e.g., NVDA_US_EQ, TSLA_US_EQ)
      const isUSDStock = position.ticker.includes('_US_')
      const isGBPStock = position.ticker.includes('_GB_') || 
                        position.ticker.includes('_UK_') || 
                        position.ticker.includes('_LON_') ||
                        (position.ticker.includes('_EQ') && !position.ticker.includes('_US_'))
      
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
        if (position.currentPrice > 1000) {
          conversionFactor = 100 // Convert from pence to pounds
        } else if (position.currentPrice > 100) {
          // For values between 100-1000, use a more sophisticated approach
          // Check if the value looks like it's already in pounds by examining the magnitude
          // Values around 200-500 are likely already in pounds (e.g., QQQ3l_EQ: 284.685)
          // Values around 800-1000 are likely in pence (e.g., ISFl_EQ: 904.5)
          if (position.currentPrice > 800) {
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
      if (position.ticker === 'AIRp_EQ' || position.ticker === 'RRl_EQ' || position.ticker === 'NVDA_US_EQ' || position.ticker === 'ISFl_EQ' || position.ticker === 'QQQ3l_EQ') {
        const marketValue = (position.quantity * position.currentPrice) / conversionFactor
        console.log(`🔍 ${position.ticker}: isGBPStock=${isGBPStock}, isUSDStock=${isUSDStock}, conversionFactor=${conversionFactor}, rawValue=${position.currentPrice}, convertedValue=${position.currentPrice / conversionFactor}, quantity=${position.quantity}, marketValue=${marketValue}`)
      }
      
      return {
        ticker: position.ticker,
        quantity: position.quantity,
        averagePrice: position.averagePrice / conversionFactor,
        currentPrice: position.currentPrice / conversionFactor,
        ppl: position.ppl / conversionFactor,
        pplPercent: pplPercent,
        marketValue: (position.quantity * position.currentPrice) / conversionFactor,
        maxBuy: (position.maxBuy || 0) / conversionFactor,
        maxSell: (position.maxSell || 0) / conversionFactor
      }
    })

    const totalValue = formattedPositions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const totalPnL = formattedPositions.reduce((sum, pos) => sum + (pos.ppl || 0), 0)
    // Calculate P/L percentage based on invested value (current value - P/L)
    const totalInvestedValue = totalValue - totalPnL
    const totalPnLPercent = totalInvestedValue > 0 ? (totalPnL / totalInvestedValue) * 100 : 0

    console.log(`✅ Portfolio data loaded for ${targetAccount.name}: ${formattedPositions.length} positions, Total P/L: ${currency}${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`);

    return NextResponse.json({
      connected: true,
      account: {
        id: targetAccount.id,
        name: targetAccount.name,
        isPractice: targetAccount.isPractice,
        isDefault: targetAccount.isDefault,
        currency: currency,
        cash: accountInfo?.cash || 0
      },
      positions: formattedPositions,
      totalPositions: formattedPositions.length,
      totalValue,
      totalPnL,
      totalPnLPercent
    })

  } catch (error) {
    console.error('Error fetching Trading212 portfolio:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolio data',
        connected: false,
        positions: []
      },
      { status: 500 }
    )
  }
}

