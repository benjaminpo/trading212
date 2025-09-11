import { formatCurrency, getCurrencySymbol, getCurrencyConfig } from '@/lib/currency'

describe('Currency utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00')
    })

    it('formats EUR currency correctly', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1.234,56')
      expect(formatCurrency(0, 'EUR')).toBe('€0,00')
    })

    it('formats GBP currency correctly', () => {
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56')
      expect(formatCurrency(0, 'GBP')).toBe('£0.00')
    })

    it('handles negative values', () => {
      expect(formatCurrency(-1234.56, 'USD')).toBe('$-1,234.56')
      expect(formatCurrency(-0.01, 'USD')).toBe('$-0.01')
    })

    it('handles very small values', () => {
      expect(formatCurrency(0.001, 'USD')).toBe('$0.00')
      expect(formatCurrency(0.01, 'USD')).toBe('$0.01')
    })

    it('handles very large values', () => {
      expect(formatCurrency(999999999.99, 'USD')).toBe('$999,999,999.99')
    })

    it('defaults to USD for unknown currency', () => {
      expect(formatCurrency(1234.56, 'UNKNOWN' as any)).toBe('$1,234.56')
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns correct symbols for known currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('GBP')).toBe('£')
      expect(getCurrencySymbol('JPY')).toBe('¥')
      expect(getCurrencySymbol('CAD')).toBe('C$')
      expect(getCurrencySymbol('AUD')).toBe('A$')
    })

    it('returns USD symbol for unknown currencies', () => {
      expect(getCurrencySymbol('UNKNOWN')).toBe('$')
      expect(getCurrencySymbol('BTC')).toBe('$')
    })

    it('handles case insensitive input', () => {
      expect(getCurrencySymbol('usd')).toBe('$')
      expect(getCurrencySymbol('Eur')).toBe('€')
      expect(getCurrencySymbol('gbp')).toBe('£')
    })
  })

  describe('getCurrencyConfig', () => {
    it('returns correct config for known currencies', () => {
      const usdConfig = getCurrencyConfig('USD')
      expect(usdConfig.symbol).toBe('$')
      expect(usdConfig.position).toBe('before')
      expect(usdConfig.decimals).toBe(2)
      expect(usdConfig.locale).toBe('en-US')

      const eurConfig = getCurrencyConfig('EUR')
      expect(eurConfig.symbol).toBe('€')
      expect(eurConfig.position).toBe('before')
      expect(eurConfig.decimals).toBe(2)
      expect(eurConfig.locale).toBe('de-DE')
    })

    it('returns USD config for unknown currencies', () => {
      const unknownConfig = getCurrencyConfig('UNKNOWN')
      expect(unknownConfig.symbol).toBe('$')
      expect(unknownConfig.position).toBe('before')
      expect(unknownConfig.decimals).toBe(2)
      expect(unknownConfig.locale).toBe('en-US')
    })

    it('handles case insensitive input', () => {
      const usdConfig = getCurrencyConfig('usd')
      expect(usdConfig.symbol).toBe('$')

      const eurConfig = getCurrencyConfig('Eur')
      expect(eurConfig.symbol).toBe('€')
    })

    it('defaults to USD when no currency provided', () => {
      const defaultConfig = getCurrencyConfig()
      expect(defaultConfig.symbol).toBe('$')
      expect(defaultConfig.position).toBe('before')
    })
  })
})
