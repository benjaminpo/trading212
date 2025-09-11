import { cn, formatCurrency } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const isDisabled = false
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )
      
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
      expect(result).not.toContain('disabled-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        'always-included': true,
        'conditionally-included': true,
        'never-included': false,
      })
      
      expect(result).toContain('always-included')
      expect(result).toContain('conditionally-included')
      expect(result).not.toContain('never-included')
    })

    it('should handle duplicate classes', () => {
      const result = cn('duplicate-class', 'other-class', 'duplicate-class')
      expect(result).toContain('duplicate-class')
      expect(result).toContain('other-class')
      // Note: clsx doesn't automatically deduplicate, it just concatenates
      // This is expected behavior for the cn utility
    })

    it('should handle complex combinations', () => {
      const isActive = true
      const variant = 'primary'
      
      const result = cn(
        'btn',
        'btn-base',
        {
          'btn-active': isActive,
          'btn-inactive': !isActive,
        },
        variant === 'primary' && 'btn-primary',
        ['rounded', 'shadow']
      )
      
      expect(result).toContain('btn')
      expect(result).toContain('btn-base')
      expect(result).toContain('btn-active')
      expect(result).not.toContain('btn-inactive')
      expect(result).toContain('btn-primary')
      expect(result).toContain('rounded')
      expect(result).toContain('shadow')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(0.99)).toBe('$0.99')
    })

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
      expect(formatCurrency(-1000)).toBe('-$1,000.00')
      expect(formatCurrency(-0.99)).toBe('-$0.99')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
      // Note: JavaScript treats -0 as negative zero, so it formats as negative
      expect(formatCurrency(-0)).toBe('-$0.00')
    })

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })

    it('should handle small decimal numbers', () => {
      expect(formatCurrency(0.01)).toBe('$0.01')
      expect(formatCurrency(0.001)).toBe('$0.00') // Should round to 2 decimal places
      expect(formatCurrency(0.005)).toBe('$0.01') // Should round up
      expect(formatCurrency(0.004)).toBe('$0.00') // Should round down
    })

    it('should handle numbers with many decimal places', () => {
      expect(formatCurrency(1234.56789)).toBe('$1,234.57') // Should round to 2 decimal places
      expect(formatCurrency(1234.564)).toBe('$1,234.56') // Should round down
      expect(formatCurrency(1234.565)).toBe('$1,234.57') // Should round up
    })

    it('should handle edge cases', () => {
      expect(formatCurrency(Number.MAX_SAFE_INTEGER)).toMatch(/^\$[\d,]+\.00$/)
      expect(formatCurrency(Number.MIN_SAFE_INTEGER)).toMatch(/^-\$[\d,]+\.00$/)
    })

    it('should handle infinity and NaN gracefully', () => {
      // These might throw errors or return special strings depending on implementation
      expect(() => formatCurrency(Infinity)).not.toThrow()
      expect(() => formatCurrency(-Infinity)).not.toThrow()
      expect(() => formatCurrency(NaN)).not.toThrow()
      
      // Test actual return values
      const infinityResult = formatCurrency(Infinity)
      const negInfinityResult = formatCurrency(-Infinity)
      const nanResult = formatCurrency(NaN)
      
      // Should return some string representation (exact format depends on implementation)
      expect(typeof infinityResult).toBe('string')
      expect(typeof negInfinityResult).toBe('string')
      expect(typeof nanResult).toBe('string')
    })

    it('should maintain precision for financial calculations', () => {
      // Test common financial amounts
      expect(formatCurrency(99.99)).toBe('$99.99')
      expect(formatCurrency(100.00)).toBe('$100.00')
      expect(formatCurrency(1000000.01)).toBe('$1,000,000.01')
    })
  })

  describe('Integration tests', () => {
    it('should work together in typical use cases', () => {
      const amount = 1234.56
      const isPositive = amount > 0
      const isLarge = amount > 1000
      
      const className = cn(
        'currency-display',
        {
          'text-green-600': isPositive,
          'text-red-600': !isPositive,
          'font-bold': isLarge,
        }
      )
      
      const formattedAmount = formatCurrency(amount)
      
      expect(className).toContain('currency-display')
      expect(className).toContain('text-green-600')
      expect(className).toContain('font-bold')
      expect(formattedAmount).toBe('$1,234.56')
    })
  })
})
