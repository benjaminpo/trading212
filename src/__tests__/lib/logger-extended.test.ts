let logger: typeof import("@/lib/logger").default;

// Mock console methods
const originalConsole = { ...console };
const originalEnv = { ...process.env };
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

describe("Logger Extended Tests", () => {
  beforeEach(() => {
    // Ensure logger is not in CI/production noop mode
    process.env.CI = "false";
    process.env.NODE_ENV = "test";
    jest.resetModules();
    // Re-require logger after setting env flags
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    logger = require("@/lib/logger").default;
    jest.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    process.env = { ...originalEnv };
  });

  describe("Logging Methods", () => {
    it("should log info messages", () => {
      logger.info("Test info message");
      expect(mockConsole.log).toHaveBeenCalledWith("Test info message");
    });

    it("should log error messages", () => {
      logger.error("Test error message");
      expect(mockConsole.error).toHaveBeenCalledWith("Test error message");
    });

    it("should log warning messages", () => {
      logger.warn("Test warning message");
      expect(mockConsole.warn).toHaveBeenCalledWith("Test warning message");
    });

    it("should log debug messages", () => {
      logger.debug("Test debug message");
      expect(mockConsole.debug).toHaveBeenCalledWith("Test debug message");
    });
  });

  describe("Message Formatting", () => {
    it("should handle string messages", () => {
      logger.info("Simple string message");
      expect(mockConsole.log).toHaveBeenCalledWith("Simple string message");
    });

    it("should handle object messages", () => {
      const obj = { key: "value", number: 123 };
      logger.info(obj);
      expect(mockConsole.log).toHaveBeenCalledWith(obj);
    });

    it("should handle array messages", () => {
      const arr = [1, 2, 3, "test"];
      logger.info(arr);
      expect(mockConsole.log).toHaveBeenCalledWith(arr);
    });

    it("should handle null and undefined", () => {
      logger.info(null);
      expect(mockConsole.log).toHaveBeenCalledWith(null);

      logger.info(undefined);
      expect(mockConsole.log).toHaveBeenCalledWith(undefined);
    });

    it("should handle boolean values", () => {
      logger.info(true);
      expect(mockConsole.log).toHaveBeenCalledWith(true);

      logger.info(false);
      expect(mockConsole.log).toHaveBeenCalledWith(false);
    });

    it("should handle numbers", () => {
      logger.info(42);
      expect(mockConsole.log).toHaveBeenCalledWith(42);

      logger.info(3.14);
      expect(mockConsole.log).toHaveBeenCalledWith(3.14);

      logger.info(0);
      expect(mockConsole.log).toHaveBeenCalledWith(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle Error objects", () => {
      const error = new Error("Test error");
      logger.error(error);
      expect(mockConsole.error).toHaveBeenCalledWith(error);
    });

    it("should handle custom error objects", () => {
      const customError = {
        name: "CustomError",
        message: "Custom error message",
        stack: "Error stack trace",
      };
      logger.error(customError);
      expect(mockConsole.error).toHaveBeenCalledWith(customError);
    });

    it("should handle thrown errors", () => {
      try {
        throw new Error("Thrown error");
      } catch (error) {
        logger.error(error);
        expect(mockConsole.error).toHaveBeenCalledWith(error);
      }
    });
  });

  describe("Multiple Arguments", () => {
    it("should handle multiple arguments", () => {
      logger.info("Message", "with", "multiple", "args");
      expect(mockConsole.log).toHaveBeenCalledWith(
        "Message",
        "with",
        "multiple",
        "args",
      );
    });

    it("should handle mixed argument types", () => {
      logger.info("String", 123, { key: "value" }, [1, 2, 3]);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "String",
        123,
        { key: "value" },
        [1, 2, 3],
      );
    });
  });

  describe("Performance", () => {
    it("should handle large objects efficiently", () => {
      const largeObject = {
        data: new Array(1000).fill("test"),
        metadata: { timestamp: Date.now(), version: "1.0.0" },
      };

      const startTime = performance.now();
      logger.info(largeObject);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(mockConsole.log).toHaveBeenCalledWith(largeObject);
    });

    it("should handle many log calls efficiently", () => {
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockConsole.log).toHaveBeenCalledTimes(1000);
    });
  });

  describe("Environment Handling", () => {
    it("should work in different environments", () => {
      // Test that logger works regardless of environment
      logger.info("Environment test");
      expect(mockConsole.log).toHaveBeenCalledWith("Environment test");
    });

    it("should handle missing console methods gracefully", () => {
      const originalLog = console.log;
      delete (console as any).log;

      expect(() => logger.info("Test")).not.toThrow();

      console.log = originalLog;
    });
  });
});
