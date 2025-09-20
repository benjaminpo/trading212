import {
  formatNumber,
  formatPercent,
  formatDate,
  sleep,
  retryWithBackoff,
  isValidEmail,
  sanitizeInput,
  truncateText,
} from "@/lib/utils";

describe("Utils - Edge Cases", () => {
  describe("formatNumber Edge Cases", () => {
    it("should handle zero", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("should handle negative numbers", () => {
      expect(formatNumber(-123.456)).toBe("-123.46");
      expect(formatNumber(-0.001)).toBe("-0.00");
    });

    it("should handle very large numbers", () => {
      expect(formatNumber(999999999.999)).toBe("999,999,999.99");
      expect(formatNumber(1000000000)).toBe("1,000,000,000.00");
    });

    it("should handle very small numbers", () => {
      expect(formatNumber(0.0001)).toBe("0.00");
      expect(formatNumber(0.0009)).toBe("0.00");
    });

    it("should handle Infinity", () => {
      expect(formatNumber(Infinity)).toBe("∞");
      expect(formatNumber(-Infinity)).toBe("-∞");
    });

    it("should handle NaN", () => {
      expect(formatNumber(NaN)).toBe("NaN");
    });

    it("should handle decimal precision edge cases", () => {
      expect(formatNumber(123.456789)).toBe("123.46");
      expect(formatNumber(123.454321)).toBe("123.45");
    });
  });

  describe("formatPercent Edge Cases", () => {
    it("should handle zero percent", () => {
      expect(formatPercent(0)).toBe("+0.00%");
    });

    it("should handle negative percentages", () => {
      expect(formatPercent(-12.3456)).toBe("-12.35%");
      expect(formatPercent(-0.001)).toBe("-0.00%");
    });

    it("should handle very large percentages", () => {
      expect(formatPercent(9999.999)).toBe("+10000.00%");
      expect(formatPercent(10000)).toBe("+10000.00%");
    });

    it("should handle very small percentages", () => {
      expect(formatPercent(0.0001)).toBe("+0.00%");
      expect(formatPercent(0.0009)).toBe("+0.00%");
    });

    it("should handle Infinity", () => {
      expect(formatPercent(Infinity)).toBe("∞%");
      expect(formatPercent(-Infinity)).toBe("-∞%");
    });

    it("should handle NaN", () => {
      expect(formatPercent(NaN)).toBe("NaN%");
    });

    it("should handle decimal precision edge cases", () => {
      expect(formatPercent(12.3456789)).toBe("+12.35%");
      expect(formatPercent(12.344321)).toBe("+12.34%");
    });
  });

  describe("formatDate Edge Cases", () => {
    it("should handle invalid date", () => {
      expect(formatDate(new Date("invalid"))).toBe("Invalid Date");
    });

    it("should handle very old date", () => {
      const oldDate = new Date("1900-01-01");
      expect(formatDate(oldDate)).toBe("Jan 1, 1900");
    });

    it("should handle future date", () => {
      const futureDate = new Date("2100-12-31");
      expect(formatDate(futureDate)).toBe("Dec 31, 2100");
    });

    it("should handle epoch date", () => {
      const epochDate = new Date(0);
      expect(formatDate(epochDate)).toBe("Jan 1, 1970");
    });

    it("should handle null date", () => {
      expect(formatDate(null as any)).toBe("Invalid Date");
    });

    it("should handle undefined date", () => {
      expect(formatDate(undefined as any)).toBe("Invalid Date");
    });

    it("should handle date with timezone edge cases", () => {
      const date = new Date("2023-12-31T23:59:59.999Z");
      expect(formatDate(date)).toBe("Dec 31, 2023");
    });
  });

  describe("sleep Edge Cases", () => {
    it("should handle zero delay", async () => {
      const start = Date.now();
      await sleep(0);
      const end = Date.now();
      expect(end - start).toBeLessThan(10);
    });

    it("should handle negative delay", async () => {
      const start = Date.now();
      await sleep(-100);
      const end = Date.now();
      expect(end - start).toBeLessThan(10);
    });

    it("should handle very small delay", async () => {
      const start = Date.now();
      await sleep(1);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(1);
    });

    it("should handle very large delay", async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe("retryWithBackoff Edge Cases", () => {
    it("should handle function that never fails", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await retryWithBackoff(mockFn, 3, 100);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should handle function that always fails", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Always fails"));
      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow(
        "Always fails",
      );
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should handle function that fails then succeeds", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValue("success");
      const result = await retryWithBackoff(mockFn, 3, 10);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should handle zero maxRetries", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Fails"));
      await expect(retryWithBackoff(mockFn, 0, 10)).rejects.toThrow("Fails");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should handle negative maxRetries", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Fails"));
      await expect(retryWithBackoff(mockFn, -1, 10)).rejects.toThrow("Fails");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should handle zero baseDelay", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValue("success");
      const result = await retryWithBackoff(mockFn, 3, 0);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should handle negative baseDelay", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First fail"))
        .mockResolvedValue("success");
      const result = await retryWithBackoff(mockFn, 3, -100);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("isValidEmail Edge Cases", () => {
    it("should handle null input", () => {
      expect(isValidEmail(null as any)).toBe(false);
    });

    it("should handle undefined input", () => {
      expect(isValidEmail(undefined as any)).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("should handle whitespace only", () => {
      expect(isValidEmail("   ")).toBe(false);
    });

    it("should handle email without domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("should handle email without @ symbol", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("should handle multiple @ symbols", () => {
      expect(isValidEmail("test@@example.com")).toBe(false);
    });

    it("should handle very long email", () => {
      const longEmail = "a".repeat(100) + "@example.com";
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it("should handle email with special characters", () => {
      expect(isValidEmail("test+tag@example.com")).toBe(true);
      expect(isValidEmail("test.name@example.com")).toBe(true);
    });

    it("should handle email with international characters", () => {
      expect(isValidEmail("test@éxample.com")).toBe(false);
    });
  });

  describe("sanitizeInput Edge Cases", () => {
    it("should handle null input", () => {
      expect(sanitizeInput(null as any)).toBe("");
    });

    it("should handle undefined input", () => {
      expect(sanitizeInput(undefined as any)).toBe("");
    });

    it("should handle empty string", () => {
      expect(sanitizeInput("")).toBe("");
    });

    it("should handle whitespace only", () => {
      expect(sanitizeInput("   ")).toBe("");
    });

    it("should handle string with HTML tags", () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        'alert("xss")',
      );
    });

    it("should handle string with special characters", () => {
      expect(sanitizeInput("test@#$%^&*()")).toBe("test@#$%^&*()");
    });

    it("should handle very long string", () => {
      const longString = "a".repeat(10000);
      expect(sanitizeInput(longString)).toBe(longString);
    });

    it("should handle string with newlines and tabs", () => {
      expect(sanitizeInput("test\n\tstring")).toBe("test\n\tstring");
    });

    it("should handle string with unicode characters", () => {
      expect(sanitizeInput("test🎉string")).toBe("test🎉string");
    });
  });

  describe("truncateText Edge Cases", () => {
    it("should handle null input", () => {
      expect(truncateText(null as any, 10)).toBe("");
    });

    it("should handle undefined input", () => {
      expect(truncateText(undefined as any, 10)).toBe("");
    });

    it("should handle empty string", () => {
      expect(truncateText("", 10)).toBe("");
    });

    it("should handle zero maxLength", () => {
      expect(truncateText("test", 0)).toBe("");
    });

    it("should handle negative maxLength", () => {
      expect(truncateText("test", -1)).toBe("");
    });

    it("should handle maxLength larger than text length", () => {
      expect(truncateText("test", 10)).toBe("test");
    });

    it("should handle maxLength equal to text length", () => {
      expect(truncateText("test", 4)).toBe("test");
    });

    it("should handle maxLength one less than text length", () => {
      expect(truncateText("test", 3)).toBe("tes...");
    });

    it("should handle custom suffix", () => {
      expect(truncateText("testing", 3, "***")).toBe("tes***");
    });

    it("should handle empty suffix", () => {
      expect(truncateText("testing", 3, "")).toBe("tes");
    });

    it("should handle suffix longer than maxLength", () => {
      expect(truncateText("test", 2, "...")).toBe("te...");
    });

    it("should handle text with newlines", () => {
      expect(truncateText("test\nstring", 6)).toBe("test\ns...");
    });

    it("should handle text with unicode characters", () => {
      expect(truncateText("test🎉string", 6)).toBe("test🎉...");
    });
  });

  describe("Integration Edge Cases", () => {
    it("should handle complete workflow with edge values", () => {
      const input = '  <script>alert("xss")</script>  ';
      const sanitized = sanitizeInput(input);
      const truncated = truncateText(sanitized, 10);

      expect(sanitized).toBe('alert("xss")');
      expect(truncated).toBe('alert("xs...');
    });

    it("should handle number formatting with edge values", () => {
      const number = -999999999.999;
      const formatted = formatNumber(number);
      const percent = formatPercent(number / 1000000);

      expect(formatted).toBe("-999,999,999.99");
      expect(percent).toBe("-999.99%");
    });

    it("should handle email validation with edge values", () => {
      const emails = [
        "",
        "   ",
        "test@",
        "@example.com",
        "test@example",
        "test@example.com",
        "test+tag@example.com",
        "test.name@example.com",
      ];

      const results = emails.map((email) => isValidEmail(email));
      expect(results).toEqual([
        false,
        false,
        false,
        false,
        false,
        true,
        true,
        true,
      ]);
    });
  });
});
