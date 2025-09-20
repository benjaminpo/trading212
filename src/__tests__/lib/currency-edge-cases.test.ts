import { convertCurrency, formatCurrency, isGBPStock, isUSDStock } from '@/lib/currency';

describe('Currency - Edge Cases', () => {
  describe('convertCurrency Edge Cases', () => {
    it('should handle zero conversion rate', () => {
      expect(convertCurrency(100, 0)).toBe(0);
    });

    it('should handle negative conversion rate', () => {
      expect(convertCurrency(100, -1.2)).toBe(-120);
    });

    it('should handle very large conversion rate', () => {
      const largeRate = 999999;
      expect(convertCurrency(100, largeRate)).toBe(99999900);
    });

    it('should handle very small conversion rate', () => {
      const smallRate = 0.000001;
      expect(convertCurrency(100, smallRate)).toBe(0.0001);
    });

    it('should handle zero amount', () => {
      expect(convertCurrency(0, 1.2)).toBe(0);
    });

    it('should handle negative amount', () => {
      expect(convertCurrency(-100, 1.2)).toBe(-120);
    });

    it('should handle decimal amount', () => {
      expect(convertCurrency(99.99, 1.2)).toBe(119.988);
    });

    it('should handle Infinity conversion rate', () => {
      expect(convertCurrency(100, Infinity)).toBe(Infinity);
    });

    it('should handle NaN conversion rate', () => {
      expect(convertCurrency(100, NaN)).toBeNaN();
    });
  });

  describe('formatCurrency Edge Cases', () => {
    it('should handle zero value', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(0, 'GBP')).toBe('£0.00');
    });

    it('should handle negative value', () => {
      expect(formatCurrency(-123.45, 'USD')).toBe('-$123.45');
      expect(formatCurrency(-123.45, 'GBP')).toBe('-£123.45');
    });

    it('should handle very large value', () => {
      const largeValue = 999999999.99;
      expect(formatCurrency(largeValue, 'USD')).toBe('$999,999,999.99');
      expect(formatCurrency(largeValue, 'GBP')).toBe('£999,999,999.99');
    });

    it('should handle very small value', () => {
      const smallValue = 0.001;
      expect(formatCurrency(smallValue, 'USD')).toBe('$0.00');
      expect(formatCurrency(smallValue, 'GBP')).toBe('£0.00');
    });

    it('should handle decimal precision', () => {
      expect(formatCurrency(123.456, 'USD')).toBe('$123.46');
      expect(formatCurrency(123.454, 'USD')).toBe('$123.45');
    });

    it('should handle unknown currency', () => {
      expect(formatCurrency(123.45, 'EUR' as any)).toBe('€123.45');
    });

    it('should handle empty currency string', () => {
      expect(formatCurrency(123.45, '' as any)).toBe('$123.45');
    });

    it('should handle null currency', () => {
      expect(formatCurrency(123.45, null as any)).toBe('$123.45');
    });

    it('should handle undefined currency', () => {
      expect(formatCurrency(123.45, undefined as any)).toBe('$123.45');
    });
  });

  describe('isGBPStock Edge Cases', () => {
    it('should handle null symbol', () => {
      expect(isGBPStock(null as any)).toBe(false);
    });

    it('should handle undefined symbol', () => {
      expect(isGBPStock(undefined as any)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isGBPStock('')).toBe(false);
    });

    it('should handle symbol with only underscores', () => {
      expect(isGBPStock('___')).toBe(false);
    });

    it('should handle symbol with mixed cases', () => {
      expect(isGBPStock('AaPl')).toBe(false);
      expect(isGBPStock('Bt')).toBe(true);
    });

    it('should handle symbol with numbers', () => {
      expect(isGBPStock('AAPL123')).toBe(false);
      expect(isGBPStock('BT123')).toBe(true);
    });

    it('should handle symbol with special characters', () => {
      expect(isGBPStock('AAPL-USD')).toBe(false);
      expect(isGBPStock('BT-GBP')).toBe(true);
    });

    it('should handle very long symbol', () => {
      const longSymbol = 'A'.repeat(100) + '_EQ';
      expect(isGBPStock(longSymbol)).toBe(false);
    });

    it('should handle symbol with spaces', () => {
      expect(isGBPStock('AAPL EQ')).toBe(false);
      expect(isGBPStock('BT EQ')).toBe(true);
    });
  });

  describe('isUSDStock Edge Cases', () => {
    it('should handle null symbol', () => {
      expect(isUSDStock(null as any)).toBe(false);
    });

    it('should handle undefined symbol', () => {
      expect(isUSDStock(undefined as any)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isUSDStock('')).toBe(false);
    });

    it('should handle symbol with only underscores', () => {
      expect(isUSDStock('___')).toBe(false);
    });

    it('should handle symbol with mixed cases', () => {
      expect(isUSDStock('AaPl')).toBe(false);
      expect(isUSDStock('GoOgL')).toBe(false);
    });

    it('should handle symbol with numbers', () => {
      expect(isUSDStock('AAPL123')).toBe(false);
      expect(isUSDStock('GOOGL123')).toBe(false);
    });

    it('should handle symbol with special characters', () => {
      expect(isUSDStock('AAPL-USD')).toBe(false);
      expect(isUSDStock('GOOGL-USD')).toBe(false);
    });

    it('should handle very long symbol', () => {
      const longSymbol = 'A'.repeat(100) + '_US_EQ';
      expect(isUSDStock(longSymbol)).toBe(false);
    });

    it('should handle symbol with spaces', () => {
      expect(isUSDStock('AAPL US EQ')).toBe(false);
      expect(isUSDStock('GOOGL US EQ')).toBe(false);
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle complete conversion workflow with edge values', () => {
      const amount = 0.001;
      const rate = 0.000001;
      const converted = convertCurrency(amount, rate);
      const formatted = formatCurrency(converted, 'USD');
      
      expect(formatted).toBe('$0.00');
    });

    it('should handle currency detection with edge symbols', () => {
      const gbpSymbol = 'BT_EQ';
      const usdSymbol = 'AAPL_US_EQ';
      const unknownSymbol = 'UNKNOWN';
      
      expect(isGBPStock(gbpSymbol)).toBe(true);
      expect(isUSDStock(usdSymbol)).toBe(true);
      expect(isGBPStock(unknownSymbol)).toBe(false);
      expect(isUSDStock(unknownSymbol)).toBe(false);
    });

    it('should handle extreme precision values', () => {
      const extremeAmount = 0.0000001;
      const extremeRate = 0.0000001;
      const result = convertCurrency(extremeAmount, extremeRate);
      
      expect(result).toBeCloseTo(0.00000000000001);
    });

    it('should handle overflow scenarios', () => {
      const maxSafeInteger = Number.MAX_SAFE_INTEGER;
      const largeRate = 2;
      
      expect(() => {
        convertCurrency(maxSafeInteger, largeRate);
      }).not.toThrow();
    });
  });
});
