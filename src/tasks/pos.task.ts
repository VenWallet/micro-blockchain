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
import { PosLinkRepository } from 'src/modules/pos/repositories/posLink.repository';
import { PosSettingsRepository } from 'src/modules/pos/repositories/posSettings.repository';
import { PaymentStatusEnum } from 'src/modules/pos/enums/paymentStatus.enum';
import { PosSocket } from 'src/modules/pos/sockets/pos.socket';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { from } from 'form-data';
import { OrderTypeEnum } from 'src/modules/spotMarket/enums/orderType.enum';

@Injectable()
export class PosTask {
  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly posLinkRepository: PosLinkRepository,
    private readonly posSettingsRepository: PosSettingsRepository,
    private readonly walletRepository: WalletRepository,
    private readonly binanceApiService: BinanceApiService,
    private readonly posSocket: PosSocket,
  ) {}

  @Cron('*/1 * * * *')
  async PosTaskPendings() {
    try {
      console.log('PosTaskPendings');
      const paymentRequests = await this.paymentRequestRepository.findPendingsAgoThirtyMinutes();

      console.log('paymentRequests', paymentRequests);

      if (!paymentRequests.length) {
        return;
      }

      const allDeposits = await this.binanceApiService.getDeposits();

      const deposits = this.filterDeposits(allDeposits);

      console.log('deposits', deposits);

      for (const paymentRequest of paymentRequests) {
        const refId = paymentRequest.refId;

        if (!/^\d{2}$/.test(refId)) {
          console.error(`Invalid refId: ${refId}`);
          continue;
        }

        const matchingDeposit = deposits.find((deposit) => {
          const amountString = deposit.amount.toString();
          const lastTwoDigits = amountString.slice(-2);
          return lastTwoDigits === refId;
        });

        console.log('matchingDeposit', matchingDeposit);

        if (matchingDeposit) {
          if (paymentRequest.token) {
            if (paymentRequest.token.tokenData.symbol !== matchingDeposit.coin) {
              console.log(`Invalid coin: ${matchingDeposit.coin}`);
              continue;
            }
          } else {
            if (paymentRequest.network.symbol !== matchingDeposit.coin) {
              console.log(`Invalid coin: ${matchingDeposit.coin}`);
              continue;
            }
          }

          const nameNetwork =
            paymentRequest.network.name === NetworksEnum.TRON ? 'TRX' : paymentRequest.network.name.toUpperCase();

          if (nameNetwork !== matchingDeposit.network) {
            console.log(`Invalid network: ${matchingDeposit.network}`);
            continue;
          }

          console.log('Updating payment request', paymentRequest.id);

          await this.paymentRequestRepository.update(paymentRequest.id, {
            status: PaymentStatusEnum.PROCESSING,
            isPaid: true,
            hash: matchingDeposit.txId,
          });
        }
      }
    } catch (error) {
      console.log('error', error?.data || error.response.data);
    }
  }

  filterDeposits(deposits: any[]): any[] {
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;

    return deposits.filter((deposit) => deposit.insertTime > thirtyMinutesAgo);
  }

  @Cron('*/1 * * * *')
  async PosTask() {
    try {
      console.log('PosTask');
      const paymentRequests = await this.paymentRequestRepository.findProcessingPaid();

      if (!paymentRequests.length) {
        return;
      }

      console.log('paymentRequests PosTask', paymentRequests);

      const data = fs.readFileSync('./exchangeInfo.json', 'utf8');
      const jsonData = JSON.parse(data);

      const deposits = await this.binanceApiService.getDeposits();

      for (const paymentRequest of paymentRequests) {
        try {
          // console.log(spotMarket);

          const deposit = deposits.find((d) => d.txId === paymentRequest.hash);

          console.log('PosTask', deposit);

          if (!deposit) {
            continue;
          }

          console.log(deposit);

          if (deposit.status !== 1) {
            continue;
          }

          const isNative: boolean = paymentRequest.token ? false : true;

          let fromNetwork;
          let fromCoin;

          if (isNative) {
            fromNetwork = paymentRequest.network;
            fromCoin = paymentRequest.network.symbol;
          } else {
            fromNetwork = paymentRequest.network;
            fromCoin = paymentRequest.token.tokenData.symbol;
          }

          let toNetwork;
          let toCoin;
          let toUserId;

          const posLinked = await this.posLinkRepository.findOneByUserLinked(paymentRequest.userId);

          if (posLinked) {
            console.log('posLinked');
            toUserId = posLinked.userId;

            const posSettings = await this.posSettingsRepository.findOneByUserId(posLinked.userId);

            console.log('posSettings', posSettings);

            if (!posSettings) {
              continue;
            }

            if (!posSettings.network_ext || !posSettings.token_ext) {
              continue;
            }

            toNetwork = posSettings.network_ext;

            if (posSettings.token_ext) {
              toCoin = posSettings.token_ext.tokenData.symbol;
            } else {
              toCoin = posSettings.network_ext.symbol;
            }
          } else {
            console.log('No posLinked');
            const posSettings = await this.posSettingsRepository.findOneByUserId(paymentRequest.userId);

            console.log('posSettings', posSettings);

            if (!posSettings) {
              continue;
            }

            toUserId = posSettings.userId;

            toNetwork = posSettings.network;

            if (posSettings.token) {
              toCoin = posSettings.token.tokenData.symbol;
            } else {
              toCoin = posSettings.network.symbol;
            }
          }
          console.log('fromNetwork', fromNetwork);
          console.log('fromCoin', fromCoin);

          console.log('toNetwork', toNetwork);
          console.log('toCoin', toCoin);

          const wallet = await this.walletRepository.findOneByUserIdAndIndex(toUserId, toNetwork.index);

          console.log('wallet', wallet);

          if (!wallet) {
            continue;
          }

          if (
            paymentRequest.exchangeType === ExchangeTypeEnum.BRIDGE ||
            paymentRequest.exchangeType === ExchangeTypeEnum.SAME
          ) {
            const network = wallet.network;

            const toNetworkSymbol =
              network.symbol === 'BNB' ? 'BSC' : network.symbol === 'ARB' ? 'ARBITRUM' : network.symbol;

            console.log('Withdraw to address', wallet.address);

            const withdrawData = await this.binanceApiService.withdraw(
              toCoin,
              wallet.address,
              Number(paymentRequest.amount),
              toNetworkSymbol,
            );

            console.log('withdrawData', withdrawData);

            await this.paymentRequestRepository.update(paymentRequest.id, {
              status: PaymentStatusEnum.COMPLETED,
              withdrawData: withdrawData,
            });

            await this.posSocket.emitEvent(
              paymentRequest.socketId,
              'payment-request:pay-status',
              await this.paymentRequestRepository.findOne(paymentRequest.id),
            );
          } else {
            console.log(fromCoin, toCoin);
            const symbol = jsonData.symbols.find(
              (s) =>
                (s.baseAsset === fromCoin && s.quoteAsset === toCoin) ||
                (s.baseAsset === toCoin && s.quoteAsset === fromCoin),
            );

            console.log('symbol', symbol);

            if (!symbol?.symbol) {
              await this.paymentRequestRepository.update(paymentRequest.id, { status: PaymentStatusEnum.CANCELED });
              continue;
            }

            const pair = symbol.symbol;

            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`).catch(() => {
              return null;
            });

            const side = fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

            let price: number | null = 0;

            if (side === 'BUY') {
              price = response?.data?.price ? parseFloat(response.data.price) : null;

              if (!price) {
                continue;
              }
            }

            const quantity = side === 'SELL' ? Number(paymentRequest.amount) : Number(paymentRequest.amount) / price;

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

            const orderData = await this.binanceApiService.trade(
              pair,
              side,
              Number(adjustedQuantity),
              OrderTypeEnum.MARKET,
            );
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

            console.log('orderData', orderData);

            if (orderData.status !== 'FILLED') {
              await this.paymentRequestRepository.update(paymentRequest.id, {
                status: PaymentStatusEnum.FAILED,
                orderData: orderData,
              });

              continue;
            }

            await this.paymentRequestRepository.update(paymentRequest.id, {
              status: PaymentStatusEnum.PROCESSING,
              orderData: orderData,
            });

            const network = wallet.network;

            const toNetworkSymbol =
              network.symbol === 'BNB' ? 'BSC' : network.symbol === 'ARB' ? 'ARBITRUM' : network.symbol;

            setTimeout(async () => {
              try {
                const withdrawData = await this.binanceApiService.withdraw(
                  toCoin,
                  wallet.address,
                  side === 'BUY' ? Number(orderData.executedQty) : Number(orderData.cummulativeQuoteQty),
                  toNetworkSymbol,
                );

                console.log('withdrawData', withdrawData);

                await this.paymentRequestRepository.update(paymentRequest.id, {
                  status: PaymentStatusEnum.COMPLETED,
                  withdrawData: withdrawData,
                });

                await this.posSocket.emitEvent(
                  paymentRequest.socketId,
                  'payment-request:pay-status',
                  await this.paymentRequestRepository.findOne(paymentRequest.id),
                );

                console.log('Retiro ejecutado exitosamente.');
              } catch (error) {
                console.error('Error al ejecutar el retiro:', error);
              }
            }, 15000);
          }
        } catch (error) {
          console.log('error', error);
          continue;
        }
      }
    } catch (error) {
      console.log('error', error?.data || error.response.data);
    }
  }
}
