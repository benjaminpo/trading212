import { Trading212API } from '@/lib/trading212'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Trading212API', () => {
  let trading212API: Trading212API
  const mockApiKey = 'test-api-key-123'

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Mock axios.create to return a mocked instance
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: { headers: { common: {} } },
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with production URL by default', () => {
      trading212API = new Trading212API(mockApiKey)
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://live.trading212.com/api/v0',
        headers: {
          'Authorization': mockApiKey,
          'Content-Type': 'application/json',
        },
      })
    })

    it('should create instance with demo URL when isPractice is true', () => {
      trading212API = new Trading212API(mockApiKey, true)
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://demo.trading212.com/api/v0',
        headers: {
          'Authorization': mockApiKey,
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('validateConnection', () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey)
    })

    it('should return true for successful connection', async () => {
      const mockResponse = { data: { cash: 1000, currency: 'USD' } }
      ;(trading212API as any).api.get.mockResolvedValue(mockResponse)

      const result = await trading212API.validateConnection()

      expect(result).toBe(true)
      expect((trading212API as any).api.get).toHaveBeenCalledWith('/equity/account/cash')
    })

    it('should return false for failed connection', async () => {
      const mockError = new Error('Network error')
      ;(trading212API as any).api.get.mockRejectedValue(mockError)

      const result = await trading212API.validateConnection()

      expect(result).toBe(false)
    })

    it('should return false for 401 unauthorized', async () => {
      const mockError = { response: { status: 401 } }
      ;(trading212API as any).api.get.mockRejectedValue(mockError)

      const result = await trading212API.validateConnection()

      expect(result).toBe(false)
    })
  })

  describe('getAccount', () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey)
    })

    it('should return account data successfully', async () => {
      const mockAccountData = {
        cash: 5000,
        currency: 'USD',
        total: 15000,
      }
      ;(trading212API as any).api.get.mockResolvedValue({ data: mockAccountData })

      const result = await trading212API.getAccount()

      expect(result).toEqual(mockAccountData)
      expect((trading212API as any).api.get).toHaveBeenCalledWith('/equity/account/cash')
    })

    it('should throw error when API call fails', async () => {
      const mockError = new Error('API Error')
      ;(trading212API as any).api.get.mockRejectedValue(mockError)

      await expect(trading212API.getAccount()).rejects.toThrow('API Error')
    })
  })

  describe('getPositions', () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey)
    })

    it('should return positions data successfully', async () => {
      const mockPositions = [
        {
          ticker: 'AAPL',
          quantity: 10,
          averagePrice: 150,
          currentPrice: 155,
          marketValue: 1550,
          ppl: 50,
          pplPercent: 3.33,
        },
        {
          ticker: 'GOOGL',
          quantity: 5,
          averagePrice: 2000,
          currentPrice: 2100,
          marketValue: 10500,
          ppl: 500,
          pplPercent: 5.0,
        },
      ]
      ;(trading212API as any).api.get.mockResolvedValue({ data: mockPositions })

      const result = await trading212API.getPositions()

      expect(result).toEqual(mockPositions)
      expect((trading212API as any).api.get).toHaveBeenCalledWith('/equity/portfolio')
    })

    it('should handle empty positions array', async () => {
      ;(trading212API as any).api.get.mockResolvedValue({ data: [] })

      const result = await trading212API.getPositions()

      expect(result).toEqual([])
    })

    it('should handle rate limiting (429 error)', async () => {
      const mockError = { 
        response: { status: 429 },
        message: 'Request failed with status code 429'
      }
      ;(trading212API as any).api.get.mockRejectedValue(mockError)

      await expect(trading212API.getPositions()).rejects.toMatchObject({
        response: { status: 429 }
      })
    })
  })

  describe('getOrders', () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey)
    })

    it('should return orders data successfully', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          ticker: 'AAPL',
          quantity: 10,
          type: 'LIMIT',
          limitPrice: 150,
          status: 'WORKING',
        },
        {
          id: 'order-2',
          ticker: 'MSFT',
          quantity: 5,
          type: 'MARKET',
          status: 'FILLED',
        },
      ]
      ;(trading212API as any).api.get.mockResolvedValue({ data: mockOrders })

      const result = await trading212API.getOrders()

      expect(result).toEqual(mockOrders)
      expect((trading212API as any).api.get).toHaveBeenCalledWith('/equity/orders')
    })

    it('should handle empty orders array', async () => {
      ;(trading212API as any).api.get.mockResolvedValue({ data: [] })

      const result = await trading212API.getOrders()

      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      trading212API = new Trading212API(mockApiKey)
    })

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      networkError.name = 'NetworkError'
      ;(trading212API as any).api.get.mockRejectedValue(networkError)

      await expect(trading212API.getAccount()).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded')
      timeoutError.name = 'TimeoutError'
      ;(trading212API as any).api.get.mockRejectedValue(timeoutError)

      await expect(trading212API.getPositions()).rejects.toThrow('timeout of 10000ms exceeded')
    })

    it('should handle server errors (500)', async () => {
      const serverError = {
        response: { 
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      }
      ;(trading212API as any).api.get.mockRejectedValue(serverError)

      await expect(trading212API.getOrders()).rejects.toMatchObject({
        response: { status: 500 }
      })
    })
  })
})
