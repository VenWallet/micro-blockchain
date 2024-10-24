import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { EnvironmentVariables } from 'src/config/env';
import { HttpCustomService } from 'src/shared/http/http.service';

@Injectable()
export class BitcoinUtils {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly httpService: HttpCustomService,
  ) {}

  async getBalanceMain(address: string): Promise<number> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await this.httpService.request<any>({
        method: 'GET',
        url: `https://blockchain.info/q/addressbalance/${address}`,
        config,
      });

      console.log('DATA', response.data);

      if (response.data === 0 || response.data > 0) {
        const satoshi = response.data as number;
        const value_satoshi = 100000000;
        const balance = satoshi / value_satoshi || 0;
        return balance;
      } else {
        throw new Error(`Error: Failed to get balance`);
      }
    } catch (error) {
      throw new Error(`Error: Failed to get balance`);
    }
  }

  async getBalanceCypher(address: string): Promise<number> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const response = await this.httpService.request<any>({
        method: 'GET',
        url: `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance?token=efe763283ba84fef88d23412be0c5970/balance?token=${this.configService.get('BLOCKCYPHER', { infer: true })!}`,
        config,
      });

      if (response.data) {
        const satoshi = response.data.balance;
        const value_satoshi = 100000000;
        return satoshi / value_satoshi || 0;
      } else {
        throw new Error(`Error: Failed to get balance`);
      }
    } catch (error) {
      throw new Error(`Error: Failed to get balance`);
    }
  }
}
