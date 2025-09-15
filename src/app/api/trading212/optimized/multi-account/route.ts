import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'
import { optimizedTrading212Service } from '@/lib/optimized-trading212'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { searchParams } = new URL(request.url)
  const includeOrders = searchParams.get('includeOrders') === 'true'
  // const _forceRefresh = searchParams.get('forceRefresh') === 'true'

    // Get user with Trading212 accounts
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { 
          trading212Accounts: {
            where: { isActive: true },
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

    if (user.trading212Accounts.length === 0) {
      return NextResponse.json({
        accounts: [],
        aggregatedStats: {
          totalPnL: 0,
          totalPnLPercent: 0,
          todayPnL: 0,
          todayPnLPercent: 0,
          activePositions: 0,
          trailStopOrders: 0,
          totalValue: 0,
          connectedAccounts: 0
        },
        connected: false,
        error: 'No Trading212 accounts configured'
      })
    }

    // Prepare accounts for multi-account fetch
    const accounts = user.trading212Accounts.map(account => ({
      id: account.id,
      apiKey: account.apiKey,
      isPractice: account.isPractice,
      name: account.name
    }))

    // Get multi-account data using optimized service
    // Note: forceRefresh is handled at the individual account level in the service
    const multiAccountData = await optimizedTrading212Service.getMultiAccountData(
      session.user.id,
      accounts,
      includeOrders
    )

    // Get aggregated data
    const aggregatedData = await optimizedTrading212Service.getAggregatedAccountData(
      session.user.id,
      accounts
    )

    // Get AI recommendations count
    const aiCount = await retryDatabaseOperation(() =>
      prisma.aIRecommendation.count({
        where: {
          userId: session.user.id,
          isActive: true
        }
      })
    )

    // Get trail stop orders count
    const trailStopCount = await retryDatabaseOperation(() =>
      prisma.trailStopLossOrder.count({
        where: {
          userId: session.user.id,
          isActive: true
        }
      })
    )

    // Format response
    const response = {
      accounts: multiAccountData.map(result => ({
        id: result.accountId,
        name: user.trading212Accounts.find(acc => acc.id === result.accountId)?.name || 'Unknown',
        data: result.data,
        error: result.error,
        cacheHit: result.cacheHit
      })),
      aggregatedStats: {
        ...aggregatedData.totalStats,
        trailStopOrders: trailStopCount,
        aiRecommendations: aiCount,
        connectedAccounts: multiAccountData.filter(result => result.data && !result.error).length
      },
      connected: multiAccountData.some(result => result.data && !result.error),
      cacheStats: {
        totalCacheHits: multiAccountData.filter(result => result.cacheHit).length,
        totalAccounts: multiAccountData.length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Optimized multi-account data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch multi-account data' },
      { status: 500 }
    )
  }
}
