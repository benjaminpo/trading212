import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'

// GET /api/trading212/accounts - List all Trading212 accounts for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { email: session.user.email! },
        include: {
          trading212Accounts: {
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

    // Don't expose the full API key in the response
    const accounts = user.trading212Accounts.map(account => ({
      id: account.id,
      name: account.name,
      isPractice: account.isPractice,
      isActive: account.isActive,
      isDefault: account.isDefault,
      currency: account.currency,
      cash: account.cash,
      lastConnected: account.lastConnected,
      lastError: account.lastError,
      apiKeyPreview: account.apiKey ? `${account.apiKey.substring(0, 8)}...${account.apiKey.substring(account.apiKey.length - 4)}` : null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching Trading212 accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/trading212/accounts - Add a new Trading212 account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, apiKey, isPractice = false, isDefault = false } = await request.json()

    if (!name || !apiKey) {
      return NextResponse.json(
        { error: 'Account name and API key are required' },
        { status: 400 }
      )
    }

    // Validate API key length
    if (apiKey.length < 30) {
      return NextResponse.json(
        { error: 'API key appears to be too short. Please check your key.' },
        { status: 400 }
      )
    }

    const user = await retryDatabaseOperation(() =>
      prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { trading212Accounts: true }
      })
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if account name already exists
    const existingAccount = user.trading212Accounts.find(acc => acc.name === name)
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account name already exists. Please choose a different name.' },
        { status: 400 }
      )
    }

    // Test the API key connection
    console.log(`🔍 Testing API key for new account: ${name}`)
    const trading212 = new Trading212API(apiKey, isPractice)
    
    let accountData = null
    let connectionError = null
    
    try {
      const isValid = await trading212.validateConnection()
      if (isValid) {
        // Fetch account data
        try {
          accountData = await trading212.getAccount()
          console.log(`✅ Account data fetched for ${name}:`, accountData)
        } catch (err) {
          console.log(`⚠️ Could not fetch account data for ${name}, but connection is valid`)
        }
      } else {
        connectionError = 'Invalid API key or connection failed'
      }
    } catch (error: any) {
      console.error(`❌ Connection test failed for ${name}:`, error)
      connectionError = error.message || 'Connection failed'
    }

    // If this is the first account or isDefault is true, make it default
    const shouldBeDefault = isDefault || user.trading212Accounts.length === 0

    // If making this account default, unset the current default
    if (shouldBeDefault) {
      await retryDatabaseOperation(() =>
        prisma.trading212Account.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false }
        })
      )
    }

    // Create the new account
    const newAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.create({
        data: {
          userId: user.id,
          name,
          apiKey,
          isPractice,
          isDefault: shouldBeDefault,
          currency: accountData?.currencyCode || null,
          cash: accountData?.cash || null,
          accountId: accountData?.id || null,
          lastConnected: connectionError ? null : new Date(),
          lastError: connectionError
        }
      })
    )

    // Return the account without the full API key
    const responseAccount = {
      id: newAccount.id,
      name: newAccount.name,
      isPractice: newAccount.isPractice,
      isActive: newAccount.isActive,
      isDefault: newAccount.isDefault,
      currency: newAccount.currency,
      cash: newAccount.cash,
      lastConnected: newAccount.lastConnected,
      lastError: newAccount.lastError,
      apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
      createdAt: newAccount.createdAt,
      updatedAt: newAccount.updatedAt
    }

    return NextResponse.json({ 
      account: responseAccount,
      message: connectionError 
        ? `Account added but connection failed: ${connectionError}` 
        : 'Account added successfully'
    })
  } catch (error) {
    console.error('Error adding Trading212 account:', error)
    return NextResponse.json(
      { error: 'Failed to add account' },
      { status: 500 }
    )
  }
}
