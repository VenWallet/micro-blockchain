import {
  ConflictException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CoreServiceExternal } from 'src/external/core-service.external';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import {
  GetAmountMinMaxDto,
  PaymentRequestDto,
  PaymentRequestPayDto,
  PosSettingsDto,
  UpdatePosSettingsDto,
} from '../dto/pos.dto';
import { PaymentRequestRepository } from '../repositories/paymentRequest.repository';
import { PaymentStatusEnum } from '../enums/paymentStatus.enum';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { TransferDto, TransferTokenDto } from 'src/modules/blockchain/blockchain.dto';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TokenService } from 'src/modules/token/token.service';
import { PosSocket } from '../sockets/pos.socket';
import { NetworkRepository } from 'src/modules/network/repositories/network.repository';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { ExchangeTypeEnum } from 'src/modules/spotMarket/enums/exchangeType.enum';
import { PosLinkRepository } from '../repositories/posLink.repository';
import { PosSettingsRepository } from '../repositories/posSettings.repository';
import * as path from 'path';
import * as fs from 'fs';
import { OrderTypeEnum } from 'src/modules/spotMarket/enums/orderType.enum';
import { BinanceApiService } from 'src/providers/binance-api/binance-api.service';
import { DepositAddressEnum } from 'src/modules/spotMarket/enums/depositAddress.enum';

const filePath = path.resolve(process.cwd(), 'exchangeInfo.json');
const exchangeInfo = fs.readFileSync(filePath, 'utf8');

@Injectable()
export class PaymentRequestService {
  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly posLinkRepository: PosLinkRepository,
    private readonly blockchainService: BlockchainService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly posSocket: PosSocket,
    private readonly networkRepository: NetworkRepository,
    private readonly posSettingsRepository: PosSettingsRepository,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  async createPaymentRequest(createPaymentRequestDto: PaymentRequestDto) {
    try {
      const network = await this.networkRepository.findOneByIndex(createPaymentRequestDto.network as IndexEnum);

      if (!network) {
        throw new NotFoundException('Network not found');
      }

      let refId: string = '';
      let isUnique = false;

      while (!isUnique) {
        refId = Math.floor(10 + Math.random() * 90).toString();

        while (refId.endsWith('0')) {
          refId = Math.floor(10 + Math.random() * 90).toString();
        }

        const existingPaymentRequest = await this.paymentRequestRepository.findOneByRefId(refId);

        if (!existingPaymentRequest) {
          isUnique = true;
        }
      }

      let adjustedAmount;

      let fee = Number((createPaymentRequestDto.amount * 0.005).toFixed(8));

      createPaymentRequestDto.amount = Number((createPaymentRequestDto.amount + fee).toFixed(8));

      if (Number.isInteger(createPaymentRequestDto.amount)) {
        adjustedAmount = Number(Number(createPaymentRequestDto.amount).toFixed(2) + String(refId));
      } else {
        adjustedAmount = Number(String(createPaymentRequestDto.amount) + String(refId));
      }

      if (!adjustedAmount) {
        throw new ConflictException('Amount must be greater than 0.01');
      }

      const paymentRequestDto = {
        ...createPaymentRequestDto,
        paymentAddress: DepositAddressEnum[network.index],
        refId,
        fee,
        amount: adjustedAmount,
        network: network.id,
      };

      const paymentRequest = await this.paymentRequestRepository.create(paymentRequestDto);

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

      const posLinked = await this.posLinkRepository.findOneByUserLinked(paymentRequest.userId);

      if (posLinked) {
        const posSettings = await this.posSettingsRepository.findOneByUserId(posLinked.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

        if (!posSettings.network_ext || !posSettings.token_ext) {
          throw new NotFoundException('PosSettings Network Ext or Token Ext not found');
        }

        toNetwork = posSettings.network_ext;

        if (posSettings.token_ext) {
          toCoin = posSettings.token_ext.tokenData.symbol;
        } else {
          toCoin = posSettings.network_ext.symbol;
        }
      } else {
        const posSettings = await this.posSettingsRepository.findOneByUserId(paymentRequest.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

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

      const toAddressDeposit = DepositAddressEnum[fromNetwork.index];

      if (!toAddressDeposit) {
        throw new NotFoundException('Deposit address not found');
      }

      if (!fromNetwork.isActive || !toNetwork.isActive) {
        throw new NotFoundException('Network is not active');
      }

      const fromIsNative = fromNetwork.symbol === fromCoin;

      const toIsNative = toNetwork.symbol === toCoin;

      if (!toIsNative) {
        const toToken = await this.tokenService.findOneBySymbolNetworkId(toCoin, toNetwork.id);

        if (!toToken) {
          throw new NotFoundException('Token not found');
        }
      }

      let exchangeType = ExchangeTypeEnum.EXCHANGE;

      if (fromNetwork.symbol === toNetwork.symbol && fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.SAME;
      } else if (fromNetwork.symbol === toNetwork.symbol) {
        exchangeType = ExchangeTypeEnum.SWAP;
      } else if (fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.BRIDGE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Deposit not enabled');
      }

      if (paymentRequest.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('Amount is less than deposit dust');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Withdraw not enabled');
      }

      const feeWithdraw = Number(toNetworkConfig.withdrawFee);

      if (exchangeType !== ExchangeTypeEnum.BRIDGE) {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === fromCoin && s.quoteAsset === toCoin) ||
            (s.baseAsset === toCoin && s.quoteAsset === fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (!symbol.orderTypes.includes('MARKET')) {
          throw new NotFoundException('Order type not found');
        }

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Pair not available');
        }

        const pair = symbol.symbol;

        const price = await this.binanceApiService.getTickerPrice(pair);

        const side = fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

        const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

        let quantity = side === 'SELL' ? Number(paymentRequest.amount) * price : Number(paymentRequest.amount) / price;

        quantity = Math.floor(quantity / stepSize) * stepSize;

        console.log('quantity', quantity);

        const feeWallet = quantity * 0.002;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = quantity - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }
      } else {
        const feeWallet = Number(paymentRequest.amount) * 0.001;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = Number(paymentRequest.amount) - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }

        if (amountReceived > Number(toNetworkConfig.withdrawMax)) {
          throw new NotFoundException('Amount is greater than withdraw max');
        }
      }

      await this.paymentRequestRepository.update(paymentRequest.id, { exchangeType: exchangeType });

      return await this.paymentRequestRepository.findOne(paymentRequest.id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async paymentRequestPay(paymentRequestPayDto: PaymentRequestPayDto) {
    const paymentRequest = await this.paymentRequestRepository.findOne(paymentRequestPayDto.paymentRequestId);

    if (!paymentRequest) {
      throw new NotFoundException('PaymentRequest not found');
    }

    try {
      await this.paymentRequestRepository.update(paymentRequest.id, { status: PaymentStatusEnum.PROCESSING });
      paymentRequest.status = PaymentStatusEnum.PROCESSING;

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

      const posLinked = await this.posLinkRepository.findOneByUserLinked(paymentRequest.userId);

      if (posLinked) {
        const posSettings = await this.posSettingsRepository.findOneByUserId(posLinked.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

        if (!posSettings.network_ext || !posSettings.token_ext) {
          throw new NotFoundException('PosSettings Network Ext or Token Ext not found');
        }

        toNetwork = posSettings.network_ext;

        if (posSettings.token_ext) {
          toCoin = posSettings.token_ext.tokenData.symbol;
        } else {
          toCoin = posSettings.network_ext.symbol;
        }
      } else {
        const posSettings = await this.posSettingsRepository.findOneByUserId(paymentRequest.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

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

      // if (fromNetwork === toNetwork && fromCoin === toCoin) {
      //   throw new ConflictException(
      //     'The source and destination networks cannot be the same. Please select different networks for the transfer',
      //   );
      // }

      const toAddressDeposit = DepositAddressEnum[fromNetwork.index];

      if (!toAddressDeposit) {
        throw new NotFoundException('Deposit address not found');
      }

      if (!fromNetwork.isActive || !toNetwork.isActive) {
        throw new NotFoundException('Network is not active');
      }

      const fromIsNative = fromNetwork.symbol === fromCoin;

      const toIsNative = toNetwork.symbol === toCoin;

      if (!toIsNative) {
        const toToken = await this.tokenService.findOneBySymbolNetworkId(toCoin, toNetwork.id);

        if (!toToken) {
          throw new NotFoundException('Token not found');
        }
      }

      let exchangeType = ExchangeTypeEnum.EXCHANGE;

      if (fromNetwork.symbol === toNetwork.symbol && fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.SAME;
      } else if (fromNetwork.symbol === toNetwork.symbol) {
        exchangeType = ExchangeTypeEnum.SWAP;
      } else if (fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.BRIDGE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Deposit not enabled');
      }

      if (paymentRequest.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('Amount is less than deposit dust');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Withdraw not enabled');
      }

      const feeWithdraw = Number(toNetworkConfig.withdrawFee);

      if (exchangeType !== ExchangeTypeEnum.BRIDGE) {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === fromCoin && s.quoteAsset === toCoin) ||
            (s.baseAsset === toCoin && s.quoteAsset === fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (!symbol.orderTypes.includes('MARKET')) {
          throw new NotFoundException('Order type not found');
        }

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Pair not available');
        }

        const pair = symbol.symbol;

        const price = await this.binanceApiService.getTickerPrice(pair);

        const side = fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

        const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

        let quantity = side === 'SELL' ? Number(paymentRequest.amount) * price : Number(paymentRequest.amount) / price;

        quantity = Math.floor(quantity / stepSize) * stepSize;

        console.log('quantity', quantity);

        const feeWallet = quantity * 0.002;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = quantity - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }
      } else {
        const feeWallet = Number(paymentRequest.amount) * 0.001;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = Number(paymentRequest.amount) - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }

        if (amountReceived > Number(toNetworkConfig.withdrawMax)) {
          throw new NotFoundException('Amount is greater than withdraw max');
        }
      }

      let hash: string | undefined;

      if (fromIsNative) {
        const transferDto: TransferDto = {
          userId: paymentRequestPayDto.userId,
          privateKey: paymentRequestPayDto.privateKey,
          network: fromNetwork.index,
          toAddress: toAddressDeposit,
          amount: Number(paymentRequest.amount),
        };

        const transfer = await this.blockchainService.transfer(transferDto, false);

        hash = transfer.hash;
      } else {
        const fromToken = await this.tokenService.findOneBySymbolNetworkId(fromCoin, fromNetwork.id);

        if (!fromToken) {
          throw new NotFoundException('Token not found');
        }

        const transferTokenDto: TransferTokenDto = {
          userId: paymentRequestPayDto.userId,
          privateKey: paymentRequestPayDto.privateKey,
          network: fromNetwork.index,
          toAddress: toAddressDeposit,
          amount: Number(paymentRequest.amount),
          token: fromToken.id,
        };

        console.log('transferTokenDto', transferTokenDto);

        const transferToken = await this.blockchainService.transferToken(transferTokenDto, false);

        hash = transferToken.hash;
      }

      if (!hash) {
        throw new InternalServerErrorException('Hash not found');
      }

      console.log('hash', hash);

      await this.paymentRequestRepository.update(paymentRequest.id, { isPaid: true, hash, exchangeType: exchangeType });

      await this.posSocket.emitEvent(
        paymentRequest.socketId,
        'payment-request:pay-status',
        await this.paymentRequestRepository.findOne(paymentRequestPayDto.paymentRequestId),
      );

      return hash;

      // const userWallet = await this.walletService.findOneByUserIdAndIndex(
      //   paymentRequest.userId,
      //   paymentRequest.network.index,
      // );

      // let hash: string | undefined;

      // if (isNative) {
      //   const transferDto: TransferDto = {
      //     userId: paymentRequestPayDto.userId,
      //     privateKey: paymentRequestPayDto.privateKey,
      //     network: paymentRequest.network.index,
      //     toAddress: userWallet.address,
      //     amount: paymentRequest.amount,
      //   };

      //   const transfer = await this.blockchainService.transfer(transferDto, false);

      //   hash = transfer.hash;
      // } else {
      //   const fromToken = await this.tokenService.findOneBySymbolNetworkId(
      //     paymentRequest.token.tokenData.symbol,
      //     paymentRequest.network.id,
      //   );

      //   if (!fromToken) {
      //     throw new NotFoundException('Token not found');
      //   }

      //   const transferTokenDto: TransferTokenDto = {
      //     userId: paymentRequestPayDto.userId,
      //     privateKey: paymentRequestPayDto.privateKey,
      //     network: paymentRequest.network.index,
      //     toAddress: userWallet.address,
      //     amount: paymentRequest.amount,
      //     token: fromToken.id,
      //   };

      //   console.log('transferTokenDto', transferTokenDto);

      //   const transferToken = await this.blockchainService.transferToken(transferTokenDto, false);

      //   hash = transferToken.hash;
      // }

      // if (!hash) {
      //   throw new InternalServerErrorException('Hash not found');
      // }

      // await this.paymentRequestRepository.update(paymentRequest.id, { isPaid: true, hash });

      // await this.posSocket.emitEvent(
      //   paymentRequest.socketId,
      //   'payment-request:pay-status',
      //   await this.paymentRequestRepository.findOne(paymentRequestPayDto.paymentRequestId),
      // );

      // return hash;
    } catch (error) {
      await this.paymentRequestRepository.update(paymentRequest.id, { status: PaymentStatusEnum.FAILED });

      await this.posSocket.emitEvent(
        paymentRequest.socketId,
        'payment-request:pay-status',
        await this.paymentRequestRepository.findOne(paymentRequestPayDto.paymentRequestId),
      );
      throw new ExceptionHandler(error);
    }
  }

  async getAmountMinMax(getAmountMinMaxDto: GetAmountMinMaxDto) {
    try {
      let data: any = {};

      const network = await this.networkRepository.findOneByIndex(getAmountMinMaxDto.network as IndexEnum);

      if (!network) {
        throw new NotFoundException('Network not found');
      }

      const isNative: boolean = getAmountMinMaxDto.token ? false : true;

      let fromNetwork;
      let fromCoin;

      if (isNative) {
        fromNetwork = network;
        fromCoin = network.symbol;
      } else {
        const token = await this.tokenService.findOneWithRelations(getAmountMinMaxDto.token!);

        if (!token) {
          throw new NotFoundException('Token not found');
        }

        fromNetwork = network;
        fromCoin = token.tokenData.symbol;
      }

      let toNetwork;
      let toCoin;

      const posLinked = await this.posLinkRepository.findOneByUserLinked(getAmountMinMaxDto.userId);

      if (posLinked) {
        const posSettings = await this.posSettingsRepository.findOneByUserId(posLinked.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

        if (!posSettings.network_ext || !posSettings.token_ext) {
          throw new NotFoundException('PosSettings Network Ext or Token Ext not found');
        }

        toNetwork = posSettings.network_ext;

        if (posSettings.token_ext) {
          toCoin = posSettings.token_ext.tokenData.symbol;
        } else {
          toCoin = posSettings.network_ext.symbol;
        }
      } else {
        const posSettings = await this.posSettingsRepository.findOneByUserId(getAmountMinMaxDto.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
        }

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

      let exchangeType = ExchangeTypeEnum.EXCHANGE;

      if (fromNetwork.symbol === toNetwork.symbol && fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.SAME;
      } else if (fromNetwork.symbol === toNetwork.symbol) {
        exchangeType = ExchangeTypeEnum.SWAP;
      } else if (fromCoin === toCoin) {
        exchangeType = ExchangeTypeEnum.BRIDGE;
      }

      console.log('exchangeType', exchangeType);

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Deposit not enabled');
      }

      data.depositDust = fromNetworkConfig.depositDust;
      data.depositDustCoin = fromCoin;

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Withdraw not enabled');
      }

      if (exchangeType !== ExchangeTypeEnum.BRIDGE && exchangeType !== ExchangeTypeEnum.SAME) {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === fromCoin && s.quoteAsset === toCoin) ||
            (s.baseAsset === toCoin && s.quoteAsset === fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (!symbol.orderTypes.includes(OrderTypeEnum.MARKET)) {
          throw new NotFoundException('Order type not found');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Pair not available');
        }

        data.withdrawMin = toNetworkConfig.withdrawMin;
        data.withdrawMinCoin = toCoin;

        data.withdrawMax = toNetworkConfig.withdrawMax;
        data.withdrawMaxCoin = toCoin;
      } else if (exchangeType === ExchangeTypeEnum.SAME) {
        data.withdrawMin = 0;
        data.withdrawMinCoin = toCoin;
        data.depositDust = 0;
        data.withdrawMax = 0;
        data.withdrawMaxCoin = toCoin;
      } else {
        data.withdrawMin = toNetworkConfig.withdrawMin;
        data.withdrawMinCoin = toCoin;

        data.withdrawMax = toNetworkConfig.withdrawMax;
        data.withdrawMaxCoin = toCoin;
      }

      return data;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
