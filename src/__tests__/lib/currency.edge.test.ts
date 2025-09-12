import { formatCurrency, getCurrencySymbol } from '@/lib/currency'

describe('currency utils edge cases', () => {
  it('handles very small amounts with correct decimals', () => {
    expect(formatCurrency(0.0049, 'GBP')).toBe('£0.00')
    expect(formatCurrency(0.005, 'GBP')).toBe('£0.01')
    expect(formatCurrency(0.009, 'USD')).toBe('$0.01')
  })

  it('handles very large amounts with grouping', () => {
    expect(formatCurrency(123456789.12, 'USD')).toBe('$123,456,789.12')
    expect(formatCurrency(9876543.21, 'GBP')).toBe('£9,876,543.21')
  })

  it('returns correct symbols', () => {
    expect(getCurrencySymbol('GBP')).toBe('£')
    expect(getCurrencySymbol('USD')).toBe('$')
  })

  it('supports EUR and JPY formatting', () => {
    // Depending on implementation, symbol might be € and ¥
    expect(getCurrencySymbol('EUR')).toBe('€')
    expect(getCurrencySymbol('JPY')).toBe('¥')
    // JPY is typically 0 decimals
    expect(formatCurrency(1234, 'JPY')).toBe('¥1,234')
    // Locale-dependent thousand/decimal separators; accept both common formats
    const eur = formatCurrency(1234.56, 'EUR')
    expect(["€1,234.56", "€1.234,56"]).toContain(eur)
  })

  it('falls back gracefully on unknown currency codes', () => {
    // Should not throw, and should default to USD or show as-is per implementation
    const formatted = formatCurrency(100, 'UNKNOWN' as any)
    expect(typeof formatted).toBe('string')
    expect(formatted).toContain('100')
  })
})


