import { formatNumber, formatPercent, formatDate } from "@/lib/utils";

describe("Utils Extended Tests", () => {
  describe("formatNumber", () => {
    it("should format positive numbers correctly", () => {
      expect(formatNumber(1234.56)).toBe("1,234.56");
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(999999.99)).toBe("999,999.99");
    });

    it("should format negative numbers correctly", () => {
      expect(formatNumber(-1234.56)).toBe("-1,234.56");
      expect(formatNumber(-0.01)).toBe("-0.01");
    });

    it("should handle very small numbers", () => {
      expect(formatNumber(0.001)).toBe("0.00");
      expect(formatNumber(0.0001)).toBe("0.00");
    });

    it("should handle very large numbers", () => {
      expect(formatNumber(1000000)).toBe("1,000,000.00");
      expect(formatNumber(999999999.99)).toBe("999,999,999.99");
    });

    it("should handle zero", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(-0)).toBe("0");
    });
  });

  describe("formatPercent", () => {
    it("should format positive percentages correctly", () => {
      expect(formatPercent(0.1234)).toBe("+0.12%");
      expect(formatPercent(1)).toBe("+1.00%");
      expect(formatPercent(0.01)).toBe("+0.01%");
    });

    it("should format negative percentages correctly", () => {
      expect(formatPercent(-0.1234)).toBe("-0.12%");
      expect(formatPercent(-1)).toBe("-1.00%");
      expect(formatPercent(-0.01)).toBe("-0.01%");
    });

    it("should handle zero percentage", () => {
      expect(formatPercent(0)).toBe("+0.00%");
    });

    it("should handle very small percentages", () => {
      expect(formatPercent(0.0001)).toBe("+0.00%");
      expect(formatPercent(0.00001)).toBe("+0.00%");
    });

    it("should handle very large percentages", () => {
      expect(formatPercent(10)).toBe("+10.00%");
      expect(formatPercent(100)).toBe("+100.00%");
    });
  });

  describe("formatDate", () => {
    it("should format dates correctly", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      expect(formatDate(date)).toBe("Jan 15, 2024");
    });

    it("should handle different date formats", () => {
      const date1 = new Date("2023-12-25T00:00:00Z");
      expect(formatDate(date1)).toBe("Dec 25, 2023");

      const date2 = new Date("2024-06-01T12:00:00Z");
      expect(formatDate(date2)).toBe("Jun 1, 2024");
    });

    it("should handle edge cases", () => {
      const date = new Date("2024-02-29T00:00:00Z"); // Leap year
      expect(formatDate(date)).toBe("Feb 29, 2024");
    });
  });

  describe("Edge Cases", () => {
    it("should handle NaN values", () => {
      expect(() => formatNumber(NaN)).not.toThrow();
      expect(() => formatPercent(NaN)).not.toThrow();
    });

    it("should handle Infinity values", () => {
      expect(() => formatNumber(Infinity)).not.toThrow();
      expect(() => formatNumber(-Infinity)).not.toThrow();
      expect(() => formatPercent(Infinity)).not.toThrow();
      expect(() => formatPercent(-Infinity)).not.toThrow();
    });

    it("should handle null and undefined dates", () => {
      expect(() => formatDate(null as any)).not.toThrow();
      expect(() => formatDate(undefined as any)).not.toThrow();
    });

    it("should handle invalid dates", () => {
      expect(() => formatDate(new Date("invalid"))).not.toThrow();
    });
  });
});
