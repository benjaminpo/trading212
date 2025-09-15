import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const accounts = user.trading212Accounts.map(account => ({
      id: account.id,
      name: account.name,
      isPractice: account.isPractice,
      isDefault: account.isDefault,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }))

    return NextResponse.json({
      accounts,
      total: accounts.length,
      hasActiveAccounts: accounts.length > 0
    })

  } catch (error) {
    console.error('Optimized accounts data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, apiKey, isPractice } = await request.json()

    if (!name || !apiKey) {
      return NextResponse.json(
        { error: 'Name and API key are required' },
        { status: 400 }
      )
    }

    // Check if account with this name already exists
    const existingAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.findFirst({
        where: {
          userId: session.user.id,
          name: name,
          isActive: true
        }
      })
    )

    if (existingAccount) {
      return NextResponse.json(
        { error: 'An account with this name already exists' },
        { status: 400 }
      )
    }

    // Create new account
    const newAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.create({
        data: {
          userId: session.user.id,
          name,
          apiKey,
          isPractice: Boolean(isPractice),
          isActive: true,
          isDefault: false // Will be set to true if it's the first account
        }
      })
    )

    // If this is the first account, make it default
    const accountCount = await retryDatabaseOperation(() =>
      prisma.trading212Account.count({
        where: {
          userId: session.user.id,
          isActive: true
        }
      })
    )

    if (accountCount === 1) {
      await retryDatabaseOperation(() =>
        prisma.trading212Account.update({
          where: { id: newAccount.id },
          data: { isDefault: true }
        })
      )
      newAccount.isDefault = true
    }

    return NextResponse.json({
      account: {
        id: newAccount.id,
        name: newAccount.name,
        isPractice: newAccount.isPractice,
        isDefault: newAccount.isDefault,
        isActive: newAccount.isActive
      },
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('Optimized account creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
