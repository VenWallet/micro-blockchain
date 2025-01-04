import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { SpotMarketRepository } from '../modules/spotMarket/repositories/spotMarket.repository';
import { script } from 'bitcoinjs-lib';
import { SpotMarketStatusEnum } from 'src/modules/spotMarket/enums/spotMarketStatus.enum';
import { WalletRepository } from '../modules/wallet/repositories/wallet.repository';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { BinanceApiService } from '../providers/binance-api/binance-api.service';
import { ExchangeTypeEnum } from 'src/modules/spotMarket/enums/exchangeType.enum';
import { net } from 'web3';
import { PaymentRequestRepository } from 'src/modules/pos/repositories/paymentRequest.repository';

@Injectable()
export class PosTask {
  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly walletRepository: WalletRepository,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  @Cron('*/1 * * * *')
  async PosTask() {
    try {
      const paymentRequests = await this.paymentRequestRepository.findProcessing();

      console.log('paymentRequests', paymentRequests);
    } catch (error) {
      console.log('error', error?.data || error.response.data);
    }
  }

  private async trade(symbol: string, side: string, quantity: number) {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity.toFixed(6)}&timestamp=${timestamp}`;

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

      // Parse and log the order result
      const orderData = response.data;

      const feeRate = 0.001; // Fee rate is typically 0.1% for spot trading
      const executedQty = parseFloat(orderData.executedQty); // Amount of base asset traded
      const price = parseFloat(orderData.fills[0].price); // Price per unit in quote asset

      // Calculate fee in quote asset
      const feeInQuoteAsset = executedQty * price * feeRate;

      return orderData;
    } catch (error) {
      console.log(error?.data || error.response.data || error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  async withdraw(asset: string, address: string, amount: number, network: string, decimals: number): Promise<any> {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      const amountAfterFee = (amount * 0.999).toFixed(6);

      const timestamp = Date.now();
      let queryString = `coin=${asset}&address=${address}&amount=${amountAfterFee}&timestamp=${timestamp}&network=${network}`;

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
      return response.data;
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      throw error;
    }
  }
}
