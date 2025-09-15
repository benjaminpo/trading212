import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Generic helper: dedupe by key keeping the item with the latest timestamp
export function dedupeLatestBy<T>(
  items: T[],
  getKey: (item: T) => string,
  getCreatedAt: (item: T) => Date | string | number
): T[] {
  const toTimestamp = (value: Date | string | number): number => {
    if (value instanceof Date) return value.getTime()
    return new Date(String(value)).getTime()
  }

  const latestByKey = new Map<string, T>()
  for (const item of items) {
    const key = getKey(item)
    const existing = latestByKey.get(key)
    if (!existing) {
      latestByKey.set(key, item)
      continue
    }
    if (toTimestamp(getCreatedAt(item)) > toTimestamp(getCreatedAt(existing))) {
      latestByKey.set(key, item)
    }
  }
  return Array.from(latestByKey.values()).sort((a, b) => {
    return toTimestamp(getCreatedAt(b)) - toTimestamp(getCreatedAt(a))
  })
}
