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

    it('handles empty string currency', () => {
      const emptyConfig = getCurrencyConfig('')
      expect(emptyConfig.symbol).toBe('$')
      expect(emptyConfig.position).toBe('before')
    })

  })

  describe('formatCurrency with options', () => {
    it('handles showSymbol option', () => {
      expect(formatCurrency(1234.56, 'USD', { showSymbol: false })).toBe('1,234.56')
      expect(formatCurrency(1234.56, 'USD', { showSymbol: true })).toBe('$1,234.56')
    })

    it('handles showCode option', () => {
      expect(formatCurrency(1234.56, 'USD', { showCode: true, showSymbol: false })).toBe('1,234.56 USD')
      expect(formatCurrency(1234.56, 'EUR', { showCode: true, showSymbol: false })).toBe('1.234,56 EUR')
    })

    it('handles compact option', () => {
      expect(formatCurrency(1000, 'USD', { compact: true })).toBe('$1.00K')
      expect(formatCurrency(1000000, 'USD', { compact: true })).toBe('$1.00M')
    })

    it('handles multiple options together', () => {
      expect(formatCurrency(1234.56, 'USD', { showSymbol: false, showCode: true })).toBe('1,234.56 USD')
      expect(formatCurrency(1000, 'USD', { showSymbol: true, compact: true })).toBe('$1.00K')
    })

    it('handles currencies with symbol after position', () => {
      expect(formatCurrency(1234.56, 'CHF')).toBe(`1${String.fromCharCode(8217)}234.56 CHF`)
      expect(formatCurrency(1234.56, 'SEK')).toBe(`1${String.fromCharCode(160)}234,56 kr`)
    })

    it('handles currencies with different decimal places', () => {
      expect(formatCurrency(1234.56, 'JPY')).toBe('¥1,235') // JPY has 0 decimals
      expect(formatCurrency(1234.56, 'HUF')).toBe('1235 Ft') // HUF has 0 decimals
    })

    it('handles currencies with 3 decimal places', () => {
      expect(formatCurrency(1234.567, 'LYD')).toBe('ل.د1.234,567')
      expect(formatCurrency(1234.567, 'TND')).toBe('د.ت1.234,567')
    })
  })

  describe('formatCurrency edge cases', () => {
    it('handles zero values for all currencies', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
      expect(formatCurrency(0, 'EUR')).toBe('€0,00')
      expect(formatCurrency(0, 'GBP')).toBe('£0.00')
    })

    it('handles very small decimal values', () => {
      expect(formatCurrency(0.001, 'USD')).toBe('$0.00')
      expect(formatCurrency(0.009, 'USD')).toBe('$0.01')
    })

    it('handles negative zero', () => {
      expect(formatCurrency(-0, 'USD')).toBe('$-0.00')
    })

    it('handles infinity values', () => {
      expect(formatCurrency(Infinity, 'USD')).toBe('$∞')
      expect(formatCurrency(-Infinity, 'USD')).toBe('$-∞')
    })

    it('handles NaN values', () => {
      expect(formatCurrency(NaN, 'USD')).toBe('$NaN')
    })

    it('defaults to USD when no currency provided', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })
  })

  describe('getCurrencySymbol edge cases', () => {
    it('handles empty string', () => {
      expect(getCurrencySymbol('')).toBe('$')
    })
  })
})
