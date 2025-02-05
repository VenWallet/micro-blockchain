import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache, Config } from 'cache-manager';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpCustomService } from 'src/shared/http/http.service';
import { IBinanceApiAvailability, IBinanceApiToken } from './binance-api.interface';
import axios, { AxiosRequestConfig } from 'axios';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config/env';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class BinanceApiService {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly httpService: HttpCustomService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    this.apiKey = this.configService.get('BINANCE_API_KEY', { infer: true })!;
    this.apiSecret = this.configService.get('BINANCE_API_SECRET', { infer: true })!;
  }

  async getDeposits() {
    try {
      let asset;
      let startTime;
      let endTime;
      let status;

      const timestamp = Date.now();
      let queryString = `timestamp=${timestamp}`;

      if (asset) queryString += `&asset=${asset}`;
      if (startTime) queryString += `&startTime=${startTime}`;
      if (endTime) queryString += `&endTime=${endTime}`;
      if (status !== undefined) queryString += `&status=${status}`;

      const signature = crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`;

      const headers = {
        'X-MBX-APIKEY': this.apiKey,
      };

      const response = await this.httpService.request<any>({
        method: 'GET',
        url,
        config: { headers },
      });

      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  async getAssetConfig(asset: string) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/sapi/v1/capital/config/getall?${queryString}&signature=${signature}`;

      const headers = {
        'X-MBX-APIKEY': this.apiKey,
      };

      console.log('url', url);

      const response = await this.httpService.request<any>({
        method: 'GET',
        url,
        config: { headers },
      });

      const filteredAsset = response?.data?.find((coin) => coin.coin === asset);

      if (!filteredAsset) {
        console.log(`Asset ${asset} not found.`);
        return null;
      }

      return filteredAsset;
    } catch (error) {
      console.log(error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  async getTickerPrice(symbol: string) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;

      const response = await this.httpService.request<any>({
        method: 'GET',
        url,
      });

      const price = response?.data?.price ? parseFloat(response.data.price) : null;

      if (!price) {
        console.log(`Price not found for ${symbol}`);
        throw new NotFoundException(`Price not found for ${symbol}`);
      }

      return price;
    } catch (error) {
      console.log(error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  async trade(symbol: string, side: string, quantity: number, orderType: string, price?: number) {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }
      const timestamp = Date.now();
      let queryString =
        price && orderType === 'LIMIT'
          ? `symbol=${symbol}&side=${side}&type=${orderType}&quantity=${quantity.toFixed(6)}&price=${price.toFixed(2)}&timeInForce=GTC&timestamp=${timestamp}`
          : `symbol=${symbol}&side=${side}&type=${orderType}&quantity=${quantity.toFixed(6)}&timestamp=${timestamp}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;

      console.log('url', url);
      // Set headers with API Key
      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      // Send POST request to place order
      const response = await axios.post(url, null, { headers });

      console.log('response', response.data);

      // Parse and log the order result
      const orderData = response.data;

      // const feeRate = 0.001; // Fee rate is typically 0.1% for spot trading
      // const executedQty = parseFloat(orderData.executedQty); // Amount of base asset traded
      // const priceData = parseFloat(orderData.fills[0].price); // Price per unit in quote asset

      // Calculate fee in quote asset
      // const feeInQuoteAsset = executedQty * priceData * feeRate;

      return orderData;
    } catch (error) {
      console.log(error?.data || error.response.data || error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  async withdraw(asset: string, address: string, amount: number, network: string): Promise<any> {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      const amountReceived = (amount * 0.99).toFixed(6);

      const timestamp = Date.now();
      let queryString = `coin=${asset}&address=${address}&amount=${amountReceived}&timestamp=${timestamp}&network=${network}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/sapi/v1/capital/withdraw/apply?${queryString}&signature=${signature}`;

      // Set headers with API Key
      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      // Send POST request to withdraw funds
      const response = await axios.post(url, null, { headers });

      // Return response data
      return { ...response.data, amountReceived };
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      throw error;
    }
  }

  async cancelLimitOrder(symbol, orderId) {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;

      console.log('Cancel Order URL:', url);

      // Set headers with API Key
      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      // Send DELETE request to cancel order
      const response = await axios.delete(url, { headers });

      console.log('Cancel Order Response:', response.data);

      return response.data;
    } catch (error) {
      console.log(error?.response?.data || error);
      throw new Error(error.message || 'Internal Server Error');
    }
  }

  async getExchangeInfo() {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');

      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }
}
