import axios, { AxiosInstance } from 'axios';

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

  constructor(apiKey: string, isPractice: boolean = false) {
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

  async getAccount(): Promise<Trading212Account> {
    try {
      const response = await this.api.get('/equity/account/cash');
      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  }

  async getPositions(): Promise<Trading212Position[]> {
    try {
      const response = await this.api.get('/equity/portfolio');
      return response.data;
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  async getOrders(): Promise<Trading212Order[]> {
    try {
      const response = await this.api.get('/equity/orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
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

    try {
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
    } catch (error) {
      console.error('Error creating trailing stop order:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: number): Promise<void> {
    try {
      await this.api.delete(`/equity/orders/${orderId}`);
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  async getHistoricalData(ticker: string, period: string = '1DAY'): Promise<unknown[]> {
    try {
      const response = await this.api.get(`/equity/historical/${ticker}`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  async getInstrumentDetails(ticker: string): Promise<unknown> {
    try {
      const response = await this.api.get(`/equity/metadata/instruments`, {
        params: { ticker }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching instrument details:', error);
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing Trading212 API connection to: ${this.api.defaults.baseURL}`);
      console.log(`🎯 Mode: ${this.isPractice ? 'Practice' : 'Live'}`);
      
      const response = await this.getAccount();
      console.log('✅ Trading212 API connection successful');
      return true;
    } catch (error: any) {
      console.error('❌ Trading212 API validation failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        baseURL: this.api.defaults.baseURL,
        isPractice: this.isPractice,
        headers: this.api.defaults.headers
      });
      
      // Additional debugging information
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('🌐 Network connectivity issue - check internet connection and API URL');
      } else if (error.response?.status === 401) {
        console.error('🔑 Authentication failed - check API key validity');
      } else if (error.response?.status === 403) {
        console.error('🚫 Access forbidden - check API key permissions');
      } else if (error.response?.status === 404) {
        console.error('🔍 API endpoint not found - check API URL and version');
      }
      
      return false;
    }
  }
}
