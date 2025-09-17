import { cn, formatCurrency, formatPercent, formatDate } from "@/lib/utils";

describe("Utils Coverage Tests", () => {
  describe("cn function", () => {
    it("should combine class names correctly", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      const includeTwo = true;
      const includeThree = false;
      expect(
        cn("class1", includeTwo && "class2", includeThree && "class3"),
      ).toBe("class1 class2");
    });

    it("should handle undefined and null values", () => {
      expect(cn("class1", undefined, null, "class2")).toBe("class1 class2");
    });

    it("should handle empty strings", () => {
      expect(cn("class1", "", "class2")).toBe("class1 class2");
    });
  });

  describe("formatCurrency function", () => {
    it("should format USD currency correctly", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
    });

    it("should handle zero values", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should handle negative values", () => {
      expect(formatCurrency(-1234.56)).toBe("-$1,234.56");
    });

    it("should handle large numbers", () => {
      expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
    });
  });

  describe("formatPercent function", () => {
    it("should format positive percentages correctly", () => {
      expect(formatPercent(12.34)).toBe("+12.34%");
    });

    it("should format negative percentages correctly", () => {
      expect(formatPercent(-12.34)).toBe("-12.34%");
    });

    it("should format zero percentage correctly", () => {
      expect(formatPercent(0)).toBe("+0.00%");
    });

    it("should handle decimal places", () => {
      expect(formatPercent(12.3456)).toBe("+12.35%");
    });
  });

  describe("formatDate function", () => {
    it("should format date correctly", () => {
      const date = new Date("2023-12-25T10:30:00Z");
      expect(formatDate(date)).toBe("Dec 25, 2023");
    });

    it("should handle different date formats", () => {
      const date = new Date("2023-01-01T00:00:00Z");
      expect(formatDate(date)).toBe("Jan 1, 2023");
    });
  });
});
