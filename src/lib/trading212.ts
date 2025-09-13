import axios, { AxiosInstance } from 'axios';
import { trading212RateLimiter } from './rate-limiter';

export interface Trading212Account {
  id: string;
  currencyCode: string;
  cash: number;
  ppl: number;
  result: number;
  blockedForStocks: number;
  blockedForOrders: number;
  pieCash: number;
}

export interface Trading212Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  pplPercent: number;
  maxBuy: number;
  maxSell: number;
}

export interface Trading212Order {
  id: number;
  ticker: string;
  quantity: number;
  type: string;
  limitPrice?: number;
  stopPrice?: number;
  value?: number;
  status: string;
  dateCreated: string;
}

export class Trading212API {
  private api: AxiosInstance;
  private isPractice: boolean;
  private apiKey: string;

  constructor(apiKey: string, isPractice: boolean = false) {
    this.apiKey = apiKey;
    this.isPractice = isPractice;
    const baseURL = isPractice 
      ? process.env.TRADING212_DEMO_API_URL || 'https://demo.trading212.com/api/v0'
      : process.env.TRADING212_LIVE_API_URL || 'https://live.trading212.com/api/v0';

    this.api = axios.create({
      baseURL,
      headers: {
        'Authorization': `${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async waitForRateLimit(): Promise<void> {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    const rateLimitKey = `trading212_${this.apiKey}`;
    
    while (!trading212RateLimiter.canMakeRequest(rateLimitKey)) {
      const waitTime = trading212RateLimiter.getTimeUntilReset(rateLimitKey);
      console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
    }
  }

  private async makeRequestWithRetry<T>(requestFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await requestFn();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Handle 429 errors specifically
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; headers?: Record<string, string> } };
          if (axiosError.response?.status === 429) {
            const retryAfter = axiosError.response.headers?.['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            
            console.log(`🔄 429 error on attempt ${attempt}. Waiting ${waitTime / 1000} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // For other errors, don't retry
        throw lastError;
      }
    }
    
    throw lastError;
  }

  async getAccount(): Promise<Trading212Account> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.api.get('/equity/account/cash');
      return response.data;
    });
  }

  async getPositions(): Promise<Trading212Position[]> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.api.get('/equity/portfolio');
      return response.data;
    });
  }

  async getOrders(): Promise<Trading212Order[]> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.api.get('/equity/orders');
      return response.data;
    });
  }

  async createTrailingStopOrder(
    ticker: string,
    quantity: number,
    trailAmount: number,
    trailPercent?: number
  ): Promise<Trading212Order> {
    if (!this.isPractice) {
      throw new Error('Trail stop orders are only available in practice mode due to API limitations');
    }

    return this.makeRequestWithRetry(async () => {
      const orderData = {
        ticker,
        quantity,
        orderType: 'STOP',
        timeValidity: 'GTC',
        trailAmount,
        ...(trailPercent && { trailPercent }),
      };

      const response = await this.api.post('/equity/orders', orderData);
      return response.data;
    });
  }

  async cancelOrder(orderId: number): Promise<void> {
    return this.makeRequestWithRetry(async () => {
      await this.api.delete(`/equity/orders/${orderId}`);
    });
  }

  async getHistoricalData(ticker: string, period: string = '1DAY'): Promise<unknown[]> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.api.get(`/equity/historical/${ticker}`, {
        params: { period }
      });
      return response.data;
    });
  }

  async getInstrumentDetails(ticker: string): Promise<unknown> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.api.get(`/equity/metadata/instruments`, {
        params: { ticker }
      });
      return response.data;
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing Trading212 API connection to: ${this.api.defaults.baseURL}`);
      console.log(`🎯 Mode: ${this.isPractice ? 'Practice' : 'Live'}`);
      
      await this.getAccount();
      console.log('✅ Trading212 API connection successful');
      return true;
    } catch (error: unknown) {
      const errorObj = error as { response?: { status?: number; statusText?: string; data?: unknown }; message?: string }
      console.error('❌ Trading212 API validation failed:', {
        status: errorObj.response?.status,
        statusText: errorObj.response?.statusText,
        data: errorObj.response?.data,
        message: errorObj.message || 'Unknown error',
        baseURL: this.api.defaults.baseURL,
        isPractice: this.isPractice,
        headers: this.api.defaults.headers
      });
      
      // Additional debugging information
      const errCode = (error as { code?: string } | undefined)?.code
      if (errCode === 'ENOTFOUND' || errCode === 'ECONNREFUSED') {
        console.error('🌐 Network connectivity issue - check internet connection and API URL');
      } else if (errorObj.response?.status === 401) {
        console.error('🔑 Authentication failed - check API key validity');
      } else if (errorObj.response?.status === 403) {
        console.error('🚫 Access forbidden - check API key permissions');
      } else if (errorObj.response?.status === 404) {
        console.error('🔍 API endpoint not found - check API URL and version');
      }
      
      return false;
    }
  }
}
