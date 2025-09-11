import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'
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
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
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
    )

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
        connected: false 
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
          connected: true
        },
        { status: 429 }
      )
    }

    // Initialize Trading212 API
    const trading212 = new Trading212API(targetAccount.apiKey, targetAccount.isPractice)

    // Fetch account data and portfolio with rate limiting protection
    const [accountResult, portfolioResult, ordersResult] = await Promise.allSettled([
      trading212.getAccount(),
      trading212.getPositions(),
      trading212.getOrders()
    ])

    const accountData = accountResult.status === 'fulfilled' ? accountResult.value : null
    const portfolioData = portfolioResult.status === 'fulfilled' ? portfolioResult.value : []
    const ordersData = ordersResult.status === 'fulfilled' ? ordersResult.value : []

    // Calculate dashboard stats
    const activePositions = portfolioData.length
    const totalPnL = portfolioData.reduce((sum, pos) => sum + (pos.ppl || 0), 0)
    const totalValue = portfolioData.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0)
    const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0

    // Calculate today's P/L (simplified - you might want to enhance this)
    const todayPnL = portfolioData.reduce((sum, pos) => {
      // This is a simplified calculation - you might want to use historical data
      return sum + (pos.ppl || 0) * 0.1 // Assume 10% of total P/L is from today
    }, 0)
    const investedValue = totalValue - totalPnL
    const todayPnLPercent = investedValue > 0 ? (todayPnL / investedValue) * 100 : 0

    const activeOrders = ordersData.filter(order => 
      order.status === 'WORKING' || order.status === 'PENDING'
    ).length

    // Update account metadata if we got fresh data
    if (accountData) {
      await retryDatabaseOperation(() =>
        prisma.trading212Account.update({
          where: { id: targetAccount.id },
          data: {
            currency: accountData.currencyCode,
            cash: accountData.cash,
            lastConnected: new Date(),
            lastError: null
          }
        })
      )
    }

    return NextResponse.json({
      connected: true,
      account: {
        id: targetAccount.id,
        name: targetAccount.name,
        cash: accountData?.cash || targetAccount.cash || 0,
        currency: accountData?.currencyCode || targetAccount.currency || 'USD',
        isPractice: targetAccount.isPractice,
        isDefault: targetAccount.isDefault
      },
      stats: {
        totalPnL,
        totalPnLPercent,
        todayPnL,
        todayPnLPercent,
        activePositions,
        trailStopOrders: 0, // We'll implement this later
        aiRecommendations: 0 // This will come from AI analysis
      },
      portfolio: portfolioData,
      orders: activeOrders
    })

  } catch (error) {
    console.error('Error fetching Trading212 account data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account data' },
      { status: 500 }
    )
  }
}

