import { Trading212API } from "@/lib/trading212";
import axios from "axios";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Trading212API", () => {
  let trading212API: Trading212API;
  const mockApiKey = "test-api-key-123";
  const expectedLiveBaseURL =
    process.env.TRADING212_LIVE_API_URL || "https://live.trading212.com/api/v0";
  const expectedDemoBaseURL =
    process.env.TRADING212_DEMO_API_URL || "https://demo.trading212.com/api/v0";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();

    // Mock axios.create to return a mocked instance
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: { headers: { common: {} } },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with production URL by default", () => {
      trading212API = new Trading212API(mockApiKey);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: expectedLiveBaseURL,
        timeout: 20000,
        headers: {
          Authorization: mockApiKey,
          "Content-Type": "application/json",
        },
      });
    });

    it("should create instance with demo URL when isPractice is true", () => {
      trading212API = new Trading212API(mockApiKey, true);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: expectedDemoBaseURL,
        timeout: 20000,
        headers: {
          Authorization: mockApiKey,
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("validateConnection", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return true for successful connection", async () => {
      const mockResponse = {
        data: { cash: 1000, currency: "USD" },
        config: { url: "/equity/account/cash" },
        status: 200,
      };
      (trading212API as any).api.get.mockResolvedValue(mockResponse);

      const result = await trading212API.validateConnection();

      expect(result).toBe(true);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/account/cash",
      );
    });

    it("should return false for failed connection", async () => {
      const mockError = new Error("Network error");
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });

    it("should return false for 401 unauthorized", async () => {
      const mockError = { response: { status: 401 } };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });
  });

  describe("getAccount", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return account data successfully", async () => {
      const mockAccountData = {
        cash: 5000,
        currency: "USD",
        total: 15000,
      };
      const mockResponse = {
        data: mockAccountData,
        config: { url: "/equity/account/cash" },
        status: 200,
      };
      (trading212API as any).api.get.mockResolvedValue(mockResponse);

      const result = await trading212API.getAccount();

      expect(result).toEqual(mockAccountData);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/account/cash",
      );
    });

    it("should throw error when API call fails", async () => {
      const mockError = new Error("API Error");
      (trading212API as any).api.get.mockRejectedValue(mockError);

      await expect(trading212API.getAccount()).rejects.toThrow("API Error");
    });
  });

  describe("getPositions", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return positions data successfully", async () => {
      const mockPositions = [
        {
          ticker: "AAPL",
          quantity: 10,
          averagePrice: 150,
          currentPrice: 155,
          marketValue: 1550,
          ppl: 50,
          pplPercent: 3.33,
        },
        {
          ticker: "GOOGL",
          quantity: 5,
          averagePrice: 2000,
          currentPrice: 2100,
          marketValue: 10500,
          ppl: 500,
          pplPercent: 5.0,
        },
      ];
      (trading212API as any).api.get.mockResolvedValue({ data: mockPositions });

      const result = await trading212API.getPositions();

      expect(result).toEqual(mockPositions);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/portfolio",
      );
    });

    it("should handle empty positions array", async () => {
      (trading212API as any).api.get.mockResolvedValue({ data: [] });

      const result = await trading212API.getPositions();

      expect(result).toEqual([]);
    });

    it.skip("should handle rate limiting (429 error)", async () => {
      const mockError = {
        response: { status: 429 },
        message: "Request failed with status code 429",
      };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      // The retry logic will eventually give up after 3 attempts
      await expect(trading212API.getPositions()).rejects.toMatchObject({
        response: { status: 429 },
      });
    }, 10000);
  });

  describe("getOrders", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return orders data successfully", async () => {
      const mockOrders = [
        {
          id: "order-1",
          ticker: "AAPL",
          quantity: 10,
          type: "LIMIT",
          limitPrice: 150,
          status: "WORKING",
        },
        {
          id: "order-2",
          ticker: "MSFT",
          quantity: 5,
          type: "MARKET",
          status: "FILLED",
        },
      ];
      (trading212API as any).api.get.mockResolvedValue({ data: mockOrders });

      const result = await trading212API.getOrders();

      expect(result).toEqual(mockOrders);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/orders",
      );
    });

    it("should handle empty orders array", async () => {
      (trading212API as any).api.get.mockResolvedValue({ data: [] });

      const result = await trading212API.getOrders();

      expect(result).toEqual([]);
    });
  });


  describe("cancelOrder", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should cancel order successfully", async () => {
      (trading212API as any).api.delete.mockResolvedValue({});

      await trading212API.cancelOrder(123);

      expect((trading212API as any).api.delete).toHaveBeenCalledWith(
        "/equity/orders/123",
      );
    });

    it("should throw error when cancel fails", async () => {
      const mockError = new Error("Cancel failed");
      (trading212API as any).api.delete.mockRejectedValue(mockError);

      await expect(trading212API.cancelOrder(123)).rejects.toThrow(
        "Cancel failed",
      );
    });
  });

  describe("getHistoricalData", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return historical data successfully", async () => {
      const mockData = [
        { date: "2023-01-01", open: 100, high: 105, low: 95, close: 102 },
        { date: "2023-01-02", open: 102, high: 108, low: 98, close: 106 },
      ];
      (trading212API as any).api.get.mockResolvedValue({ data: mockData });

      const result = await trading212API.getHistoricalData("AAPL");

      expect(result).toEqual(mockData);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/historical/AAPL",
        {
          params: { period: "1DAY" },
        },
      );
    });

    it("should return historical data with custom period", async () => {
      const mockData = [{ date: "2023-01-01", open: 100, close: 102 }];
      (trading212API as any).api.get.mockResolvedValue({ data: mockData });

      const result = await trading212API.getHistoricalData("AAPL", "1HOUR");

      expect(result).toEqual(mockData);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/historical/AAPL",
        {
          params: { period: "1HOUR" },
        },
      );
    });
  });

  describe("getInstrumentDetails", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should return instrument details successfully", async () => {
      const mockDetails = {
        ticker: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
        currency: "USD",
      };
      (trading212API as any).api.get.mockResolvedValue({ data: mockDetails });

      const result = await trading212API.getInstrumentDetails("AAPL");

      expect(result).toEqual(mockDetails);
      expect((trading212API as any).api.get).toHaveBeenCalledWith(
        "/equity/metadata/instruments",
        {
          params: { ticker: "AAPL" },
        },
      );
    });
  });

  describe("validateConnection error handling", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should handle ENOTFOUND error", async () => {
      const mockError = { code: "ENOTFOUND" };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });

    it("should handle ECONNREFUSED error", async () => {
      const mockError = { code: "ECONNREFUSED" };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });

    it("should handle 403 forbidden error", async () => {
      const mockError = { response: { status: 403 } };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });

    it("should handle 404 not found error", async () => {
      const mockError = { response: { status: 404 } };
      (trading212API as any).api.get.mockRejectedValue(mockError);

      const result = await trading212API.validateConnection();

      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey);
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Network Error");
      networkError.name = "NetworkError";
      (trading212API as any).api.get.mockRejectedValue(networkError);

      await expect(trading212API.getAccount()).rejects.toThrow("Network Error");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("timeout of 10000ms exceeded");
      timeoutError.name = "TimeoutError";
      (trading212API as any).api.get.mockRejectedValue(timeoutError);

      await expect(trading212API.getPositions()).rejects.toThrow(
        "timeout of 10000ms exceeded",
      );
    });

    it("should handle server errors (500)", async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
      };
      (trading212API as any).api.get.mockRejectedValue(serverError);

      await expect(trading212API.getOrders()).rejects.toThrow();
    });
  });
});
