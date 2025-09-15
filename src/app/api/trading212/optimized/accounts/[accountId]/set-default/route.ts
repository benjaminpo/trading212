import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, retryDatabaseOperation } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await params

    // Check if account belongs to user
    const targetAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
          isActive: true
        }
      })
    )

    if (!targetAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Remove default from all other accounts
    await retryDatabaseOperation(() =>
      prisma.trading212Account.updateMany({
        where: {
          userId: session.user.id,
          isActive: true,
          id: { not: accountId }
        },
        data: { isDefault: false }
      })
    )

    // Set this account as default
    const updatedAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.update({
        where: { id: accountId },
        data: { isDefault: true }
      })
    )

    return NextResponse.json({
      account: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        isPractice: updatedAccount.isPractice,
        isDefault: updatedAccount.isDefault,
        isActive: updatedAccount.isActive
      },
      message: 'Default account updated successfully'
    })

  } catch (error) {
    console.error('Optimized set default account error:', error)
    return NextResponse.json(
      { error: 'Failed to set default account' },
      { status: 500 }
    )
  }
}
