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

@Injectable()
export class TasksService {
  constructor(
    private readonly spotMarketRepository: SpotMarketRepository,
    private readonly walletRepository: WalletRepository,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  // @Cron('*/1 * * * *')
  async SpotMarketTask() {
    try {
      const spotMarkets = await this.spotMarketRepository.findPendings();

      if (!spotMarkets.length) {
        return;
      }

      const data = fs.readFileSync('exchangeInfo.json', 'utf8');
      const jsonData = JSON.parse(data);

      const deposits = await this.binanceApiService.getDeposits();

      for (const spotMarket of spotMarkets) {
        try {
          console.log(spotMarket);

          const deposit = deposits.find((d) => d.txId === spotMarket.hash);

          if (!deposit) {
            continue;
          }

          console.log(deposit);

          if (deposit.status !== 1) {
            continue;
          }

          if (spotMarket.exchangeType === ExchangeTypeEnum.BRIGDE) {
            const wallet = await this.walletRepository.findOneByUserIdAndIndex(
              spotMarket.userId,
              spotMarket.toNetwork as IndexEnum,
            );

            if (!wallet) {
              continue;
            }

            const network = wallet.network;

            const withdrawData = await this.withdraw(
              spotMarket.toCoin,
              wallet.address,
              Number(spotMarket.amount),
              network.symbol,
              network.decimals,
            );

            console.log('withdrawData', withdrawData);

            await this.spotMarketRepository.update(spotMarket.id, {
              status: SpotMarketStatusEnum.COMPLETED,
              withdrawData: withdrawData,
            });
          } else {
            const symbol = jsonData.symbols.find(
              (s) =>
                (s.baseAsset === spotMarket.fromCoin && s.quoteAsset === spotMarket.toCoin) ||
                (s.baseAsset === spotMarket.toCoin && s.quoteAsset === spotMarket.fromCoin),
            );

            if (!symbol?.symbol) {
              await this.spotMarketRepository.update(spotMarket.id, { status: SpotMarketStatusEnum.CANCELLED });
              continue;
            }

            const pair = symbol.symbol;

            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`).catch(() => {
              return null;
            });

            const price = response?.data?.price ? parseFloat(response.data.price) : null;

            if (!price) {
              continue;
            }

            const side = spotMarket.fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

            let quantity = side === 'SELL' ? Number(spotMarket.amount) * price : Number(spotMarket.amount) / price;

            // Ajustar la cantidad al stepSize definido
            const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

            // Función para ajustar la cantidad al stepSize
            function adjustQuantity(qty, step) {
              return Math.floor(qty / step) * step; // Redondear hacia abajo al múltiplo más cercano
            }

            quantity = adjustQuantity(quantity, stepSize);

            const orderData = await this.trade(pair, side, quantity);

            if (orderData.status !== 'FILLED') {
              await this.spotMarketRepository.update(spotMarket.id, {
                status: SpotMarketStatusEnum.FAILED,
                symbol: pair,
                side: side,
                price: price.toString(),
                quantity: orderData.executedQty,
                orderData: orderData,
              });
            }

            await this.spotMarketRepository.update(spotMarket.id, {
              status: SpotMarketStatusEnum.PENDING,
              symbol: pair,
              side: side,
              price: price.toString(),
              quantity: orderData.executedQty,
              orderData: orderData,
            });

            const wallet = await this.walletRepository.findOneByUserIdAndIndex(
              spotMarket.userId,
              spotMarket.toNetwork as IndexEnum,
            );

            if (!wallet) {
              continue;
            }

            const network = wallet.network;

            const withdrawData = await this.withdraw(
              spotMarket.toCoin,
              wallet.address,
              Number(spotMarket.amount),
              network.symbol,
              network.decimals,
            );

            console.log('withdrawData', withdrawData);

            await this.spotMarketRepository.update(spotMarket.id, {
              status: SpotMarketStatusEnum.COMPLETED,
              withdrawData: withdrawData,
            });
          }
        } catch (error) {
          console.log(error);
          continue;
        }
      }
    } catch (error) {
      console.log(error.data);
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
      const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;

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
      console.log(error);
      throw new Error(error.message || error || 'Internal Server Error');
    }
  }

  private async withdraw(
    asset: string,
    address: string,
    amount: number,
    network: string,
    decimals: number,
  ): Promise<any> {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      const amountAfterFee = (amount * 0.99).toFixed(6);

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
