import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/trading212/accounts/[accountId]/set-default - Set account as default
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
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

    const { accountId } = await params
    
    const account = await prisma.trading212Account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!account.isActive) {
      return NextResponse.json({ error: 'Cannot set inactive account as default' }, { status: 400 })
    }

    // Unset current default account
    await prisma.trading212Account.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false }
    })

    // Set new default account
    await prisma.trading212Account.update({
      where: { id: accountId },
      data: { isDefault: true }
    })

    return NextResponse.json({ message: 'Default account updated successfully' })
  } catch (error) {
    console.error('Error setting default Trading212 account:', error)
    return NextResponse.json(
      { error: 'Failed to set default account' },
      { status: 500 }
    )
  }
}
