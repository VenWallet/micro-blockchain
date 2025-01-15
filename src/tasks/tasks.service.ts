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
import { OrderTypeEnum } from 'src/modules/spotMarket/enums/orderType.enum';

@Injectable()
export class TasksService {
  constructor(
    private readonly spotMarketRepository: SpotMarketRepository,
    private readonly walletRepository: WalletRepository,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  @Cron('*/1 * * * *')
  async SpotMarketTask() {
    try {
      const spotMarkets = await this.spotMarketRepository.findPendings();

      if (!spotMarkets.length) {
        return;
      }

      const data = fs.readFileSync('./exchangeInfo.json', 'utf8');
      const jsonData = JSON.parse(data);

      const deposits = await this.binanceApiService.getDeposits();

      // console.log('deposits', deposits);

      for (const spotMarket of spotMarkets) {
        try {
          // console.log(spotMarket);

          const deposit = deposits.find((d) => d.txId === spotMarket.hash);

          console.log(deposit);

          if (!deposit) {
            continue;
          }

          if (deposit.status !== 1) {
            continue;
          }

          if (spotMarket.exchangeType === ExchangeTypeEnum.BRIDGE) {
            const wallet = await this.walletRepository.findOneByUserIdAndIndex(
              spotMarket.userId,
              spotMarket.toNetwork as IndexEnum,
            );

            if (!wallet) {
              continue;
            }

            const network = wallet.network;

            const toNetworkSymbol =
              network.symbol === 'BNB' ? 'BSC' : network.symbol === 'ARB' ? 'ARBITRUM' : network.symbol;

            const withdrawData = await this.withdraw(
              spotMarket.toCoin,
              wallet.address,
              Number(spotMarket.amount),
              toNetworkSymbol,
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

            console.log('symbol', symbol);

            if (!symbol?.symbol) {
              await this.spotMarketRepository.update(spotMarket.id, { status: SpotMarketStatusEnum.CANCELLED });
              continue;
            }

            const pair = symbol.symbol;

            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`).catch(() => {
              return null;
            });

            const side = spotMarket.fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

            let price: number | undefined = spotMarket.price ? parseFloat(spotMarket.price) : 0;

            if (side === 'BUY' && spotMarket.orderType !== OrderTypeEnum.LIMIT) {
              price = response?.data?.price ? parseFloat(response.data.price) : undefined;

              if (!price) {
                continue;
              }
            }

            if (!price) {
              console.log('price continue', price);
              continue;
            }

            const quantity = side === 'SELL' ? Number(spotMarket.amount) : Number(spotMarket.amount) / price;

            console.log('quantity', quantity);
            // Ajustar la cantidad al stepSize definido
            const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

            // // Función para ajustar la cantidad al stepSize
            // function adjustQuantity(qty, step) {
            //   return Math.floor(qty / step) * step; // Redondear hacia abajo al múltiplo más cercano
            // }

            // const quantityFinal = adjustQuantity(quantity, stepSize * 2);

            const adjustedQuantity = Math.floor(quantity / stepSize) * stepSize;

            console.log('adjustedQuantity', adjustedQuantity);

            console.log('price', price);

            const orderData = await this.trade(pair, side, Number(adjustedQuantity), spotMarket.orderType, price);

            // const orderData: any = {
            //   symbol: 'NEARUSDT',
            //   orderId: 3653727657,
            //   orderListId: -1,
            //   clientOrderId: 'rvBTnEUJUBecIYVPkdd5Pa',
            //   transactTime: 1736981761235,
            //   price: '7.00000000',
            //   origQty: '2.00000000',
            //   executedQty: '0.00000000',
            //   origQuoteOrderQty: '0.00000000',
            //   cummulativeQuoteQty: '0.00000000',
            //   status: 'NEW',
            //   timeInForce: 'GTC',
            //   type: 'LIMIT',
            //   side: 'SELL',
            //   workingTime: 1736981761235,
            //   fills: [],
            //   selfTradePreventionMode: 'EXPIRE_MAKER',
            // };
            // const orderData = {
            //   symbol: 'NEARUSDT',
            //   orderId: 3420040618,
            //   orderListId: -1,
            //   clientOrderId: 'AceHsJgWMYdXohGqSXpgXu',
            //   transactTime: 1733165641057,
            //   price: '0.00000000',
            //   origQty: '3.50000000',
            //   executedQty: '3.50000000',
            //   cummulativeQuoteQty: '23.64950000',
            //   status: 'FILLED',
            //   timeInForce: 'GTC',
            //   type: 'MARKET',
            //   side: 'BUY',
            //   workingTime: 1733165641057,
            //   fills: [
            //     {
            //       price: '6.75700000',
            //       qty: '3.50000000',
            //       commission: '0.00350000',
            //       commissionAsset: 'NEAR',
            //       tradeId: 225585905,
            //     },
            //   ],
            //   selfTradePreventionMode: 'EXPIRE_MAKER',
            // };

            if (orderData.status === 'NEW') {
              await this.spotMarketRepository.update(spotMarket.id, {
                status: SpotMarketStatusEnum.SCHEDULED,
                symbol: pair,
                side: side,
                quantity: side === 'BUY' ? orderData.cummulativeQuoteQty : orderData.executedQty,
                orderData: orderData,
              });

              continue;
            } else if (orderData.status !== 'FILLED') {
              await this.spotMarketRepository.update(spotMarket.id, {
                status: SpotMarketStatusEnum.FAILED,
                symbol: pair,
                side: side,
                price: orderData.fills.length > 0 ? orderData.fills[0].price : undefined,
                quantity: side === 'BUY' ? orderData.cummulativeQuoteQty : orderData.executedQty,
                orderData: orderData,
              });

              continue;
            }

            await this.spotMarketRepository.update(spotMarket.id, {
              status: SpotMarketStatusEnum.PROCESSING,
              symbol: pair,
              side: side,
              price: orderData.fills.length > 0 ? orderData.fills[0].price : undefined,
              quantity: side === 'BUY' ? orderData.cummulativeQuoteQty : orderData.executedQty,
              orderData: orderData,
            });

            const wallet: any = await this.walletRepository.findOneByUserIdAndIndex(
              spotMarket.userId,
              spotMarket.toNetwork as IndexEnum,
            );

            if (!wallet) {
              continue;
            }

            const network = wallet.network;

            const toNetworkSymbol =
              network.symbol === 'BNB' ? 'BSC' : network.symbol === 'ARB' ? 'ARBITRUM' : network.symbol;

            setTimeout(async () => {
              try {
                const withdrawData = await this.withdraw(
                  spotMarket.toCoin,
                  wallet.address,
                  side === 'BUY' ? Number(orderData.executedQty) : Number(orderData.cummulativeQuoteQty),
                  toNetworkSymbol,
                  network.decimals,
                );

                console.log('withdrawData', withdrawData);

                await this.spotMarketRepository.update(spotMarket.id, {
                  status: SpotMarketStatusEnum.COMPLETED,
                  withdrawData: withdrawData,
                });

                console.log('Retiro ejecutado exitosamente.');
              } catch (error) {
                console.error('Error al ejecutar el retiro:', error);
              }
            }, 15000);
          }
        } catch (error) {
          // console.log('error', error);
          continue;
        }
      }
    } catch (error) {
      console.log('error', error?.data || error.response.data);
    }
  }

  @Cron('*/1 * * * *')
  async SpotMarketScheduledTask() {
    try {
      const spotMarkets = await this.spotMarketRepository.findScheduled();

      if (!spotMarkets.length) {
        return;
      }

      for (const spotMarket of spotMarkets) {
        console.log('spotMarket', spotMarket);

        const orderData = await this.getOrder(spotMarket.symbol, spotMarket.orderData.orderId);

        console.log('orderData', orderData);

        if (orderData.status === 'FILLED') {
          const wallet: any = await this.walletRepository.findOneByUserIdAndIndex(
            spotMarket.userId,
            spotMarket.toNetwork as IndexEnum,
          );

          if (!wallet) {
            continue;
          }

          const network = wallet.network;

          const toNetworkSymbol =
            network.symbol === 'BNB' ? 'BSC' : network.symbol === 'ARB' ? 'ARBITRUM' : network.symbol;

          setTimeout(async () => {
            try {
              const withdrawData = await this.withdraw(
                spotMarket.toCoin,
                wallet.address,
                spotMarket.side === 'BUY' ? Number(orderData.executedQty) : Number(orderData.cummulativeQuoteQty),
                toNetworkSymbol,
                network.decimals,
              );

              console.log('withdrawData', withdrawData);

              await this.spotMarketRepository.update(spotMarket.id, {
                status: SpotMarketStatusEnum.COMPLETED,
                withdrawData: withdrawData,
              });

              console.log('Retiro ejecutado exitosamente.');
            } catch (error) {
              console.error('Error al ejecutar el retiro:', error);
            }
          }, 15000);
        }
      }
    } catch (error) {
      console.log('error findScheduled', error?.data || error.response.data);
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<any> {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      const timestamp = Date.now();

      let queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;

      // Set headers with API Key
      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      // Send POST request to withdraw funds
      const response = await axios.get(url, { headers });

      // Return response data
      return response.data;
    } catch (error) {
      console.error('Error getOrder:', error);
      throw error;
    }
  }

  private async trade(symbol: string, side: string, quantity: number, orderType: string, price?: number) {
    try {
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }
      const timestamp = Date.now();
      let queryString = price
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

  async withdraw(asset: string, address: string, amount: number, network: string, decimals: number): Promise<any> {
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
