import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils'

describe('Utils', () => {
  describe('cn', () => {
    it('should combine class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2')
    })

    it('should handle undefined and null values', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
    })

    it('should handle empty strings', () => {
      expect(cn('class1', '', 'class2')).toBe('class1 class2')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('should format negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
    })

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })
  })

  describe('formatPercent', () => {
    it('should format positive percentages', () => {
      expect(formatPercent(12.34)).toBe('+12.34%')
    })

    it('should format negative percentages', () => {
      expect(formatPercent(-12.34)).toBe('-12.34%')
    })

    it('should format zero percentage', () => {
      expect(formatPercent(0)).toBe('+0.00%')
    })

    it('should handle decimal places', () => {
      expect(formatPercent(12.3456)).toBe('+12.35%')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-12-25')
      expect(formatDate(date)).toBe('Dec 25, 2023')
    })

    it('should handle different dates', () => {
      const date = new Date('2024-01-01')
      expect(formatDate(date)).toBe('Jan 1, 2024')
    })

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29')
      expect(formatDate(date)).toBe('Feb 29, 2024')
    })
  })
})