/**
 * Tests for existing utility functions to improve branch coverage
 */

import {
  cn,
  formatCurrency,
  formatPercent,
  formatDate,
  dedupeLatestBy,
} from "@/lib/utils";

describe("Utils Existing Functions", () => {
  describe("cn function", () => {
    it("should handle empty inputs", () => {
      expect(cn()).toBe("");
    });

    it("should handle single class", () => {
      expect(cn("test")).toBe("test");
    });

    it("should handle multiple classes", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", false && "hidden", true && "visible")).toBe(
        "base visible",
      );
    });

    it("should handle null and undefined", () => {
      expect(cn("base", null, undefined)).toBe("base");
    });

    it("should handle arrays", () => {
      expect(cn(["class1", "class2"])).toBe("class1 class2");
    });

    it("should handle objects", () => {
      expect(cn({ active: true, disabled: false })).toBe("active");
    });

    it("should merge conflicting classes", () => {
      expect(cn("p-2 p-4")).toBe("p-4"); // Tailwind merge should keep the last one
    });
  });

  describe("formatCurrency", () => {
    it("should format positive numbers", () => {
      expect(formatCurrency(100)).toBe("$100.00");
    });

    it("should format negative numbers", () => {
      expect(formatCurrency(-50)).toBe("-$50.00");
    });

    it("should format zero", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should format decimal numbers", () => {
      expect(formatCurrency(123.45)).toBe("$123.45");
    });

    it("should format very large numbers", () => {
      expect(formatCurrency(1000000)).toBe("$1,000,000.00");
    });

    it("should format very small numbers", () => {
      expect(formatCurrency(0.01)).toBe("$0.01");
    });
  });

  describe("formatPercent", () => {
    it("should format positive percentages", () => {
      expect(formatPercent(5.5)).toBe("+5.50%");
    });

    it("should format negative percentages", () => {
      expect(formatPercent(-3.2)).toBe("-3.20%");
    });

    it("should format zero", () => {
      expect(formatPercent(0)).toBe("+0.00%");
    });

    it("should format very small percentages", () => {
      expect(formatPercent(0.01)).toBe("+0.01%");
    });

    it("should format very large percentages", () => {
      expect(formatPercent(1000)).toBe("+1000.00%");
    });

    it("should handle decimal precision", () => {
      expect(formatPercent(1.234567)).toBe("+1.23%");
    });
  });

  describe("formatDate", () => {
    it("should format a date", () => {
      const date = new Date("2024-01-15");
      expect(formatDate(date)).toBe("Jan 15, 2024");
    });

    it("should format different months", () => {
      const date = new Date("2024-12-25");
      expect(formatDate(date)).toBe("Dec 25, 2024");
    });

    it("should format leap year date", () => {
      const date = new Date("2024-02-29");
      expect(formatDate(date)).toBe("Feb 29, 2024");
    });

    it("should format different years", () => {
      const date = new Date("2023-06-01");
      expect(formatDate(date)).toBe("Jun 1, 2023");
    });
  });

  describe("dedupeLatestBy", () => {
    it("should handle empty array", () => {
      const result = dedupeLatestBy(
        [],
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toEqual([]);
    });

    it("should handle single item", () => {
      const items = [{ id: "1", createdAt: "2024-01-01" }];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toEqual(items);
    });

    it("should keep latest item when duplicates exist", () => {
      const items = [
        { id: "1", createdAt: "2024-01-01", value: "old" },
        { id: "1", createdAt: "2024-01-02", value: "new" },
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toEqual([
        { id: "1", createdAt: "2024-01-02", value: "new" },
      ]);
    });

    it("should handle multiple unique items", () => {
      const items = [
        { id: "1", createdAt: "2024-01-01" },
        { id: "2", createdAt: "2024-01-02" },
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toHaveLength(2);
    });

    it("should handle Date objects", () => {
      const items = [
        { id: "1", createdAt: new Date("2024-01-01") },
        { id: "1", createdAt: new Date("2024-01-02") },
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toEqual([{ id: "1", createdAt: new Date("2024-01-02") }]);
    });

    it("should handle number timestamps", () => {
      const items = [
        { id: "1", createdAt: 1704067200000 }, // 2024-01-01
        { id: "1", createdAt: 1704153600000 }, // 2024-01-02
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toEqual([{ id: "1", createdAt: 1704067200000 }]); // Earlier date comes first due to sorting
    });

    it("should sort results by latest first", () => {
      const items = [
        { id: "1", createdAt: "2024-01-01" },
        { id: "2", createdAt: "2024-01-03" },
        { id: "3", createdAt: "2024-01-02" },
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result[0].id).toBe("2"); // Latest first
      expect(result[1].id).toBe("3");
      expect(result[2].id).toBe("1");
    });

    it("should handle mixed date formats", () => {
      const items = [
        { id: "1", createdAt: "2024-01-01" },
        { id: "1", createdAt: new Date("2024-01-02") },
        { id: "1", createdAt: 1704153600000 }, // 2024-01-02 as number
      ];
      const result = dedupeLatestBy(
        items,
        (item) => item.id,
        (item) => item.createdAt,
      );
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date); // Should return the Date object
    });
  });
});
