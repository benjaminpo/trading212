import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Trading212API } from '@/lib/trading212'

// GET /api/trading212/accounts/[accountId] - Get specific account details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const account = await prisma.trading212Account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Return account without the full API key
    const responseAccount = {
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
    }

    return NextResponse.json({ account: responseAccount })
  } catch (error) {
    console.error('Error fetching Trading212 account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    )
  }
}

// PUT /api/trading212/accounts/[accountId] - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, apiKey, isPractice, isActive, isDefault } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { trading212Accounts: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    
    const account = await prisma.trading212Account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if new name conflicts with existing accounts (excluding current account)
    if (name && name !== account.name) {
      const existingAccount = user.trading212Accounts.find(acc => acc.name === name && acc.id !== account.id)
      if (existingAccount) {
        return NextResponse.json(
          { error: 'Account name already exists. Please choose a different name.' },
          { status: 400 }
        )
      }
    }

    let accountData = null
    let connectionError = null

    // If API key is being updated, test the connection
    if (apiKey && apiKey !== account.apiKey) {
      if (apiKey.length < 30) {
        return NextResponse.json(
          { error: 'API key appears to be too short. Please check your key.' },
          { status: 400 }
        )
      }

      console.log(`🔍 Testing updated API key for account: ${account.name}`)
      const trading212 = new Trading212API(apiKey, isPractice ?? account.isPractice)
      
      try {
        const isValid = await trading212.validateConnection()
        if (isValid) {
          try {
            accountData = await trading212.getAccount()
            console.log(`✅ Updated account data fetched for ${account.name}:`, accountData)
          } catch {
            console.log(`⚠️ Could not fetch account data for ${account.name}, but connection is valid`)
          }
        } else {
          connectionError = 'Invalid API key or connection failed'
        }
      } catch (error: unknown) {
        console.error(`❌ Connection test failed for ${account.name}:`, error)
        connectionError = error instanceof Error ? error.message : 'Connection failed'
      }
    }

    // If making this account default, unset the current default
    if (isDefault && !account.isDefault) {
      await prisma.trading212Account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    // Update the account
    const updatedAccount = await prisma.trading212Account.update({
      where: { id: accountId },
      data: {
        ...(name && { name }),
        ...(apiKey && { apiKey }),
        ...(isPractice !== undefined && { isPractice }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(accountData && {
          currency: accountData.currencyCode,
          cash: accountData.cash,
          accountId: accountData.id
        }),
        ...(apiKey && {
          lastConnected: connectionError ? account.lastConnected : new Date(),
          lastError: connectionError
        })
      }
    })

    // Return updated account without the full API key
    const responseAccount = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      isPractice: updatedAccount.isPractice,
      isActive: updatedAccount.isActive,
      isDefault: updatedAccount.isDefault,
      currency: updatedAccount.currency,
      cash: updatedAccount.cash,
      lastConnected: updatedAccount.lastConnected,
      lastError: updatedAccount.lastError,
      apiKeyPreview: updatedAccount.apiKey ? `${updatedAccount.apiKey.substring(0, 8)}...${updatedAccount.apiKey.substring(updatedAccount.apiKey.length - 4)}` : null,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt
    }

    return NextResponse.json({ 
      account: responseAccount,
      message: connectionError 
        ? `Account updated but connection failed: ${connectionError}` 
        : 'Account updated successfully'
    })
  } catch (error) {
    console.error('Error updating Trading212 account:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

// DELETE /api/trading212/accounts/[accountId] - Delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { trading212Accounts: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const account = await prisma.trading212Account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Delete the account
    await prisma.trading212Account.delete({
      where: { id: accountId }
    })

    // If this was the default account, make the first remaining account default
    if (account.isDefault && user.trading212Accounts.length > 1) {
      const remainingAccounts = user.trading212Accounts.filter(acc => acc.id !== account.id)
      if (remainingAccounts.length > 0) {
        await prisma.trading212Account.update({
          where: { id: remainingAccounts[0].id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error deleting Trading212 account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
