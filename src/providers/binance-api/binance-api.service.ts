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
import { AxiosRequestConfig } from 'axios';
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
}
