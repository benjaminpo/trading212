// import { prisma } from './prisma' // Unused for now

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  accountId: string
  userId: string
  dataType: 'portfolio' | 'account' | 'orders' | 'positions'
}

export interface CachedPortfolioData {
  positions: unknown[]
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  currency: string
  lastUpdated: string
}

export interface CachedAccountData {
  account: unknown
  portfolio: unknown[]
  orders: unknown[]
  stats: unknown
  lastUpdated: string
}

// Cache configuration
const CACHE_TTL = {
  portfolio: 2 * 60 * 1000, // 2 minutes for portfolio data
  account: 5 * 60 * 1000,   // 5 minutes for account data
  orders: 1 * 60 * 1000,    // 1 minute for orders
  positions: 2 * 60 * 1000, // 2 minutes for positions
} as const

export class APICache {
  private static instance: APICache
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly MAX_MEMORY_ENTRIES = 1000

  private constructor() {}

  static getInstance(): APICache {
    if (!APICache.instance) {
      APICache.instance = new APICache()
    }
    return APICache.instance
  }

  private generateKey(userId: string, accountId: string, dataType: string, params?: Record<string, unknown>): string {
    const paramString = params ? JSON.stringify(params) : ''
    return `${userId}:${accountId}:${dataType}:${paramString}`
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private cleanExpiredEntries(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
      }
    }
  }

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      // Remove oldest entries first
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      const toRemove = entries.slice(0, Math.floor(this.MAX_MEMORY_ENTRIES * 0.2)) // Remove 20%
      toRemove.forEach(([key]) => this.memoryCache.delete(key))
    }
  }

  async get<T>(
    userId: string, 
    accountId: string, 
    dataType: keyof typeof CACHE_TTL,
    params?: Record<string, unknown>
  ): Promise<T | null> {
    const key = this.generateKey(userId, accountId, dataType, params)
    const entry = this.memoryCache.get(key)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.memoryCache.delete(key)
      return null
    }

    console.log(`🎯 Cache HIT for ${dataType} (${accountId}): ${key}`)
    return entry.data as T
  }

  async set<T>(
    userId: string,
    accountId: string,
    dataType: keyof typeof CACHE_TTL,
    data: T,
    params?: Record<string, unknown>
  ): Promise<void> {
    const key = this.generateKey(userId, accountId, dataType, params)
    const ttl = CACHE_TTL[dataType]

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accountId,
      userId,
      dataType
    }

    this.memoryCache.set(key, entry)
    this.cleanExpiredEntries()
    this.enforceMemoryLimit()

    console.log(`💾 Cache SET for ${dataType} (${accountId}): ${key}`)
  }

  async invalidate(userId: string, accountId?: string, dataType?: keyof typeof CACHE_TTL): Promise<void> {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.userId === userId) {
        if (!accountId || entry.accountId === accountId) {
          if (!dataType || entry.dataType === dataType) {
            keysToDelete.push(key)
          }
        }
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`🗑️ Cache INVALIDATED: ${keysToDelete.length} entries for user ${userId}`)
    }
  }

  async invalidateAll(): Promise<void> {
    this.memoryCache.clear()
    console.log('🗑️ Cache CLEARED: All entries removed')
  }

  getStats(): { totalEntries: number; memoryUsage: number } {
    return {
      totalEntries: this.memoryCache.size,
      memoryUsage: this.memoryCache.size * 1024 // Rough estimate
    }
  }

  // Database-backed cache for persistent data
  async getFromDatabase<T>(): Promise<T | null> {
    try {
      // For now, we'll use memory cache only
      // In the future, this could be extended to use Redis or database
      const result = null as T | null
      return result
    } catch (error) {
      console.error('Database cache error:', error)
      return null
    }
  }

  async setInDatabase(): Promise<void> {
    try {
      // For now, we'll use memory cache only
      // In the future, this could be extended to use Redis or database
      return
    } catch (error) {
      console.error('Database cache error:', error)
    }
  }
}

// Global cache instance
export const apiCache = APICache.getInstance()

// Cache decorator for API functions
export function withCache<T extends unknown[], R>(
  dataType: keyof typeof CACHE_TTL,
  keyGenerator: (...args: T) => { userId: string; accountId: string; params?: Record<string, unknown> }
) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      const { userId, accountId, params } = keyGenerator(...args)
      
      // Try to get from cache first
      const cached = await apiCache.get<R>(userId, accountId, dataType, params)
      if (cached !== null) {
        return cached
      }

      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      await apiCache.set(userId, accountId, dataType, result, params)
      
      return result
    }
  }
}
