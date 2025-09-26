import { formatCurrency, convertCurrency } from "@/lib/currency";

describe("Currency Extended Tests", () => {
  describe("formatCurrency", () => {
    it("should format USD currency correctly", () => {
      expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
      expect(formatCurrency(0, "USD")).toBe("$0.00");
      expect(formatCurrency(999999.99, "USD")).toBe("$999,999.99");
    });

    it("should format EUR currency correctly", () => {
      expect(formatCurrency(1234.56, "EUR")).toBe("€1.234,56");
      expect(formatCurrency(0, "EUR")).toBe("€0,00");
      expect(formatCurrency(999999.99, "EUR")).toBe("€999.999,99");
    });

    it("should format GBP currency correctly", () => {
      expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56");
      expect(formatCurrency(0, "GBP")).toBe("£0.00");
      expect(formatCurrency(999999.99, "GBP")).toBe("£999,999.99");
    });

    it("should handle negative values", () => {
      expect(formatCurrency(-1234.56, "USD")).toBe("-$1,234.56");
      expect(formatCurrency(-0.01, "EUR")).toBe("-€0,01");
    });

    it("should handle very small values", () => {
      expect(formatCurrency(0.001, "USD")).toBe("$0.00");
      expect(formatCurrency(0.01, "USD")).toBe("$0.01");
    });

    it("should handle very large values", () => {
      expect(formatCurrency(1000000, "USD")).toBe("$1,000,000.00");
      expect(formatCurrency(999999999.99, "USD")).toBe("$999,999,999.99");
    });
  });

  describe("convertCurrency", () => {
    it("should handle currency conversion with rate", () => {
      expect(convertCurrency(100, 1.2)).toBe(120);
      expect(convertCurrency(50, 0.8)).toBe(40);
      expect(convertCurrency(200, 1.5)).toBe(300);
    });

    it("should return same value for rate of 1", () => {
      expect(convertCurrency(100, 1)).toBe(100);
      expect(convertCurrency(0, 1)).toBe(0);
      expect(convertCurrency(-50, 1)).toBe(-50);
    });

    it("should handle zero values", () => {
      expect(convertCurrency(0, 1.2)).toBe(0);
      expect(convertCurrency(100, 0)).toBe(0);
    });

    it("should handle negative values", () => {
      expect(convertCurrency(-100, 1.2)).toBe(-120);
      expect(convertCurrency(100, -1.2)).toBe(-120);
    });

    it("should handle NaN inputs", () => {
      expect(convertCurrency(NaN, 1.2)).toBe(NaN);
      expect(convertCurrency(100, NaN)).toBe(NaN);
    });

    it("should handle Infinity rates", () => {
      expect(convertCurrency(100, Infinity)).toBe(Infinity);
      expect(convertCurrency(100, -Infinity)).toBe(-Infinity);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined currency gracefully", () => {
      expect(() => formatCurrency(100, undefined as any)).not.toThrow();
    });

    it("should handle null currency gracefully", () => {
      expect(() => formatCurrency(100, null as any)).not.toThrow();
    });

    it("should handle invalid currency codes", () => {
      expect(() => formatCurrency(100, "INVALID" as any)).not.toThrow();
    });

    it("should handle NaN values", () => {
      expect(() => formatCurrency(NaN, "USD")).not.toThrow();
    });

    it("should handle Infinity values", () => {
      expect(() => formatCurrency(Infinity, "USD")).not.toThrow();
      expect(() => formatCurrency(-Infinity, "USD")).not.toThrow();
    });
  });
});
