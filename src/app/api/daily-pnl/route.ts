import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'
import { optimizedTrading212Service } from '@/lib/optimized-trading212'

// GET /api/daily-pnl - Fetch daily P/L history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }
    if (!startDate && !endDate) {
      // Default to last N days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      dateFilter.gte = cutoffDate
    }

    // Build where clause
    const where: { userId: string; date: { gte?: Date; lte?: Date }; accountId?: string } = {
      userId: session.user.id,
      date: dateFilter
    }

    if (accountId) {
      where.accountId = accountId
    }

    // Check if DailyPnL table exists, if not return empty data
    let dailyPnL: unknown[] = []
    try {
      dailyPnL = await retryDatabaseOperation(() =>
        prisma.dailyPnL.findMany({
          where,
          orderBy: { date: 'desc' },
          take: days
        })
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('DailyPnL table not found, returning empty data:', errorMessage)
      // Return empty data if table doesn't exist yet
      dailyPnL = []
    }

    // Calculate summary statistics
    const totalDays = dailyPnL.length
    const totalPnLChange = totalDays > 1 ? dailyPnL[0].totalPnL - dailyPnL[totalDays - 1].totalPnL : 0
    const bestDay = dailyPnL.reduce((best, day) => day.todayPnL > best.todayPnL ? day : best, dailyPnL[0] || { todayPnL: 0 })
    const worstDay = dailyPnL.reduce((worst, day) => day.todayPnL < worst.todayPnL ? day : worst, dailyPnL[0] || { todayPnL: 0 })

    return NextResponse.json({
      dailyPnL,
      summary: {
        totalDays,
        totalPnLChange,
        bestDay: bestDay ? {
          date: bestDay.date,
          todayPnL: bestDay.todayPnL
        } : null,
        worstDay: worstDay ? {
          date: worstDay.date,
          todayPnL: worstDay.todayPnL
        } : null,
        averageDailyPnL: totalDays > 0 ? dailyPnL.reduce((sum, day) => sum + day.todayPnL, 0) / totalDays : 0
      }
    })

  } catch (error: unknown) {
    console.error('Daily P/L fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily P/L data' },
      { status: 500 }
    )
  }
}

// POST /api/daily-pnl - Capture current P/L snapshot
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, forceRefresh = false } = await request.json()

    // Get user's Trading212 accounts
    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          trading212Accounts: {
            where: {
              isActive: true,
              ...(accountId ? { id: accountId } : {})
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

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of day

    const results = []

    for (const account of user.trading212Accounts) {
      try {
        // Check rate limiting
        if (!optimizedTrading212Service.canMakeRequest(session.user.id, account.id)) {
          console.log(`⏳ Rate limited for account ${account.id}, skipping daily P/L capture`)
          continue
        }

        // Get current account data
        const accountData = forceRefresh 
          ? await optimizedTrading212Service.forceRefreshAccountData(
              session.user.id,
              account.id,
              account.apiKey,
              account.isPractice
            )
          : await optimizedTrading212Service.getAccountData(
              session.user.id,
              account.id,
              account.apiKey,
              account.isPractice
            )

        if (!accountData.account) {
          console.log(`⚠️ Account ${account.id} not connected, skipping daily P/L capture`)
          continue
        }

        // Check if we already have data for today
        let existingRecord = null
        try {
          existingRecord = await retryDatabaseOperation(() =>
            prisma.dailyPnL.findUnique({
              where: {
                userId_accountId_date: {
                  userId: session.user.id,
                  accountId: account.id,
                  date: today
                }
              }
            })
          )
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.log('DailyPnL table not found, will create new record:', errorMessage)
        }

        const dailyPnLData = {
          userId: session.user.id,
          accountId: account.id,
          date: today,
          totalPnL: accountData.stats.totalPnL || 0,
          todayPnL: accountData.stats.todayPnL || 0,
          totalValue: accountData.stats.totalValue || 0,
          cash: accountData.account?.cash || null,
          currency: accountData.account?.currencyCode || 'USD',
          positions: accountData.stats.activePositions || 0
        }

        if (existingRecord) {
          // Update existing record
          try {
            const updated = await retryDatabaseOperation(() =>
              prisma.dailyPnL.update({
                where: { id: existingRecord.id },
                data: dailyPnLData
              })
            )
            results.push({ accountId: account.id, action: 'updated', data: updated })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.log('Failed to update daily P/L record:', errorMessage)
            results.push({ accountId: account.id, action: 'error', error: errorMessage })
          }
        } else {
          // Create new record
          try {
            const created = await retryDatabaseOperation(() =>
              prisma.dailyPnL.create({
                data: dailyPnLData
              })
            )
            results.push({ accountId: account.id, action: 'created', data: created })
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.log('Failed to create daily P/L record:', errorMessage)
            results.push({ accountId: account.id, action: 'error', error: errorMessage })
          }
        }

        console.log(`📊 Daily P/L captured for account ${account.name}: Total P/L: ${dailyPnLData.totalPnL}, Today P/L: ${dailyPnLData.todayPnL}`)

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error capturing daily P/L for account ${account.id}:`, error)
        results.push({ accountId: account.id, action: 'error', error: errorMessage })
      }
    }

    return NextResponse.json({
      message: 'Daily P/L snapshots captured',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: unknown) {
    console.error('Daily P/L capture error:', error)
    return NextResponse.json(
      { error: 'Failed to capture daily P/L data' },
      { status: 500 }
    )
  }
}
