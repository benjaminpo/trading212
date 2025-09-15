import { prisma } from './prisma'
import { optimizedTrading212Service } from './optimized-trading212'
// import { optimizedAIService } from './optimized-ai-service' // Unused for now

export interface SyncStats {
  usersProcessed: number
  accountsProcessed: number
  cacheHits: number
  errors: number
  executionTime: number
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService
  private isRunning = false
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_USERS_PER_SYNC = 10
  private readonly MAX_ACCOUNTS_PER_USER = 5

  private constructor() {}

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService()
    }
    return BackgroundSyncService.instance
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Background sync is already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Starting background sync service')

    // Run initial sync
    await this.runSync()

    // Schedule periodic syncs
    this.syncInterval = setInterval(async () => {
      await this.runSync()
    }, this.SYNC_INTERVAL)
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    console.log('⏹️ Background sync service stopped')
  }

  private async runSync(): Promise<SyncStats> {
    const startTime = Date.now()
    const stats: SyncStats = {
      usersProcessed: 0,
      accountsProcessed: 0,
      cacheHits: 0,
      errors: 0,
      executionTime: 0
    }

    try {
      console.log('🔄 Starting background sync...')

      // Get active users with Trading212 accounts
      const users = await prisma.user.findMany({
        where: {
          trading212Accounts: {
            some: {
              isActive: true
            }
          }
        },
        include: {
          trading212Accounts: {
            where: {
              isActive: true
            },
            take: this.MAX_ACCOUNTS_PER_USER
          }
        },
        take: this.MAX_USERS_PER_SYNC
      })

      console.log(`👥 Found ${users.length} users with active Trading212 accounts`)

      for (const user of users) {
        try {
          const accounts = user.trading212Accounts.map(acc => ({
            id: acc.id,
            apiKey: acc.apiKey,
            isPractice: acc.isPractice,
            name: acc.name
          }))

          // Perform background sync for this user
          await optimizedTrading212Service.backgroundSync(user.id, accounts)
          
          stats.usersProcessed++
          stats.accountsProcessed += accounts.length

          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`❌ Background sync failed for user ${user.id}:`, error)
          stats.errors++
        }
      }

      stats.executionTime = Date.now() - startTime

      console.log(`✅ Background sync completed: ${stats.usersProcessed} users, ${stats.accountsProcessed} accounts, ${stats.executionTime}ms`)

      return stats

    } catch (error) {
      console.error('❌ Background sync error:', error)
      stats.errors++
      stats.executionTime = Date.now() - startTime
      return stats
    }
  }

  async syncUser(userId: string): Promise<{
    success: boolean
    accountsProcessed: number
    errors: number
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          trading212Accounts: {
            where: {
              isActive: true
            }
          }
        }
      })

      if (!user || user.trading212Accounts.length === 0) {
        return {
          success: false,
          accountsProcessed: 0,
          errors: 0
        }
      }

      const accounts = user.trading212Accounts.map(acc => ({
        id: acc.id,
        apiKey: acc.apiKey,
        isPractice: acc.isPractice,
        name: acc.name
      }))

      await optimizedTrading212Service.backgroundSync(userId, accounts)

      return {
        success: true,
        accountsProcessed: accounts.length,
        errors: 0
      }

    } catch (error) {
      console.error(`❌ User sync failed for ${userId}:`, error)
      return {
        success: false,
        accountsProcessed: 0,
        errors: 1
      }
    }
  }

  async clearOldCache(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Clear old AI recommendations
      const deletedRecommendations = await prisma.aIRecommendation.deleteMany({
        where: {
          createdAt: {
            lt: oneDayAgo
          },
          isActive: false
        }
      })

      console.log(`🗑️ Cleared ${deletedRecommendations.count} old AI recommendations`)

      return deletedRecommendations.count

    } catch (error) {
      console.error('❌ Cache cleanup error:', error)
      return 0
    }
  }

  async healthCheck(): Promise<{
    isRunning: boolean
    lastSync: string
    nextSync: string
      stats: {
        cache: Record<string, unknown>
        batches: Record<string, unknown>
      }
  }> {
    const lastSync = new Date(Date.now() - this.SYNC_INTERVAL).toISOString()
    const nextSync = new Date(Date.now() + this.SYNC_INTERVAL).toISOString()

    return {
      isRunning: this.isRunning,
      lastSync,
      nextSync,
      stats: {
        cache: optimizedTrading212Service.getCacheStats(),
        batches: optimizedTrading212Service.getBatchStats()
      }
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning
  }
}

// Global background sync service instance
export const backgroundSyncService = BackgroundSyncService.getInstance()

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  backgroundSyncService.start().catch(error => {
    console.error('Failed to start background sync service:', error)
  })
}
