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
    const { name, apiKey, isPractice } = await request.json()

    if (!name || !apiKey) {
      return NextResponse.json(
        { error: 'Name and API key are required' },
        { status: 400 }
      )
    }

    // Check if account belongs to user
    const existingAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id
        }
      })
    )

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if another account with this name already exists
    const duplicateAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.findFirst({
        where: {
          userId: session.user.id,
          name: name,
          id: { not: accountId },
          isActive: true
        }
      })
    )

    if (duplicateAccount) {
      return NextResponse.json(
        { error: 'An account with this name already exists' },
        { status: 400 }
      )
    }

    // Update account
    const updatedAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.update({
        where: { id: accountId },
        data: {
          name,
          apiKey,
          isPractice: Boolean(isPractice),
          updatedAt: new Date()
        }
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
      message: 'Account updated successfully'
    })

  } catch (error) {
    console.error('Optimized account update error:', error)
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingAccount = await retryDatabaseOperation(() =>
      prisma.trading212Account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id
        }
      })
    )

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if this is the last account
    const accountCount = await retryDatabaseOperation(() =>
      prisma.trading212Account.count({
        where: {
          userId: session.user.id,
          isActive: true
        }
      })
    )

    if (accountCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last account' },
        { status: 400 }
      )
    }

    // Soft delete account
    await retryDatabaseOperation(() =>
      prisma.trading212Account.update({
        where: { id: accountId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
    )

    // If deleted account was default, make another account default
    if (existingAccount.isDefault) {
      const nextAccount = await retryDatabaseOperation(() =>
        prisma.trading212Account.findFirst({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: accountId }
          },
          orderBy: { createdAt: 'asc' }
        })
      )

      if (nextAccount) {
        await retryDatabaseOperation(() =>
          prisma.trading212Account.update({
            where: { id: nextAccount.id },
            data: { isDefault: true }
          })
        )
      }
    }

    return NextResponse.json({
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Optimized account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
