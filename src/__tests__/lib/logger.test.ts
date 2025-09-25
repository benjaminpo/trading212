import { logger } from "@/lib/logger";

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
const mockConsoleDebug = jest.spyOn(console, "debug").mockImplementation();
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();
const mockConsoleError = jest.spyOn(console, "error").mockImplementation();

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleDebug.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe("in development environment", () => {
    beforeEach(() => {
      // Mock development environment
      process.env.NODE_ENV = "development";
      process.env.CI = "false";

      // Re-import logger to get fresh instance
      jest.resetModules();
    });

    it("should call console.log for info", () => {
      const { logger: devLogger } = require("@/lib/logger");
      devLogger.info("test message");
      expect(mockConsoleLog).toHaveBeenCalledWith("test message");
    });

    it("should call console.debug for debug", () => {
      const { logger: devLogger } = require("@/lib/logger");
      devLogger.debug("debug message");
      expect(mockConsoleDebug).toHaveBeenCalledWith("debug message");
    });
  });

  describe("in production environment", () => {
    beforeEach(() => {
      // Mock production environment
      process.env.NODE_ENV = "production";
      process.env.CI = "false";

      // Re-import logger to get fresh instance
      jest.resetModules();
    });

    it("should not call console.log for info in production", () => {
      const { logger: prodLogger } = require("@/lib/logger");
      prodLogger.info("test message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should not call console.debug for debug in production", () => {
      const { logger: prodLogger } = require("@/lib/logger");
      prodLogger.debug("debug message");
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe("in CI environment", () => {
    beforeEach(() => {
      // Mock CI environment
      process.env.NODE_ENV = "development";
      process.env.CI = "true";

      // Re-import logger to get fresh instance
      jest.resetModules();
    });

    it("should not call console.log for info in CI", () => {
      const { logger: ciLogger } = require("@/lib/logger");
      ciLogger.info("test message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should not call console.debug for debug in CI", () => {
      const { logger: ciLogger } = require("@/lib/logger");
      ciLogger.debug("debug message");
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe("warn and error methods", () => {
    it("should always call console.warn for warn", () => {
      logger.warn("warning message");
      expect(mockConsoleWarn).toHaveBeenCalledWith("warning message");
    });

    it("should always call console.error for error", () => {
      logger.error("error message");
      expect(mockConsoleError).toHaveBeenCalledWith("error message");
    });

    it("should handle multiple arguments", () => {
      logger.warn("warning", "with", "multiple", "args");
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "warning",
        "with",
        "multiple",
        "args",
      );
    });

    it("should handle objects and arrays", () => {
      const obj = { key: "value" };
      const arr = [1, 2, 3];
      logger.error("error", obj, arr);
      expect(mockConsoleError).toHaveBeenCalledWith("error", obj, arr);
    });
  });
});
