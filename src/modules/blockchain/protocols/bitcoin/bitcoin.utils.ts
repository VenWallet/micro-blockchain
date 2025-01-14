import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
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

  async newTxFee(amount: number, address: string) {
    try {
      const value_satoshi = 100000000;
      const amountSatoshi = amount * value_satoshi;

      const data = {
        inputs: [
          {
            addresses: [address],
          },
        ],
        outputs: [
          {
            addresses: [address],
            value: parseInt(String(amountSatoshi)),
          },
        ],
      };

      const config = {
        method: 'post',
        url: 'https://api.blockcypher.com/v1/btc/main/txs/new?token=62ab930cc08e407abf0de0d36abfedc8',
        headers: {
          'Content-Type': 'application/json',
        },
        data: data,
      };

      const TATUN_API_KEY = this.configService.get('TATUM_API_KEY');

      const fee = await axios(config)
        .then(async function (tmptx) {
          let inputs = tmptx.data.tx.inputs.length;
          let outputs = tmptx.data.tx.outputs.length;
          let bytes = inputs * 146 + outputs * 33 + 16;
          let resp = await axios
            .get('https://api.tatum.io/v3/blockchain/fee/BTC', {
              headers: { 'x-api-key': TATUN_API_KEY },
            })
            .then(async function (response) {
              let meta = response.data.fast;

              let fee = (bytes * meta) / 100000000;

              return fee;
            })
            .catch(function (error) {
              console.log('error', error);
              throw new Error(`Error bitcoin tx'`);
            });

          return resp;
        })
        .catch(async function (error) {
          console.log('error', error);
          throw new Error(`Error bitcoin tx ${error.message}`);
        });
      return fee;
    } catch (error: any) {
      throw new Error(`Error bitcoin tx ${error.message}`);
    }
  }
}
