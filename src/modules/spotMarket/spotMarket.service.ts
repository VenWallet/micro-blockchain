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
import { BlockchainService } from '../blockchain/blockchain.service';
import { create } from 'domain';
import { IndexEnum } from '../network/enums/index.enum';
import { NetworkService } from '../network/network.service';
import { CreateSpotMarketDto, PreviewSpotMarketDto, SpotMarketDto } from './dto/spotMarket.dto';
import { WalletService } from '../wallet/wallet.service';
import { TokenService } from '../token/token.service';
import * as fs from 'fs';
import { TransferDto, TransferTokenDto } from '../blockchain/blockchain.dto';
import { DepositAddressEnum } from './enums/depositAddress.enum';
import { SpotMarketStatusEnum } from './enums/spotMarketStatus.enum';
import { SpotMarketRepository } from './repositories/spotMarket.repository';
import { ExchangeTypeEnum } from './enums/exchangeType.enum';
import { BinanceApiService } from 'src/providers/binance-api/binance-api.service';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), 'exchangeInfo.json');
const exchangeInfo = fs.readFileSync(filePath, 'utf8');

@Injectable()
export class SpotMarketService {
  constructor(
    private readonly spotMarketRepository: SpotMarketRepository,
    private readonly blockchainService: BlockchainService,
    private readonly networkService: NetworkService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly binanceApiService: BinanceApiService,
  ) {}

  async createSpotMarket(createSpotMarketDto: CreateSpotMarketDto) {
    try {
      if (
        !Object.values(IndexEnum).includes(createSpotMarketDto.fromNetwork) ||
        !Object.values(IndexEnum).includes(createSpotMarketDto.toNetwork)
      ) {
        throw new ConflictException('Invalid network');
      }

      if (
        createSpotMarketDto.fromNetwork === createSpotMarketDto.toNetwork &&
        createSpotMarketDto.fromCoin === createSpotMarketDto.toCoin
      ) {
        throw new ConflictException(
          'The source and destination networks cannot be the same. Please select different networks for the transfer',
        );
      }

      const toAddressDeposit = DepositAddressEnum[createSpotMarketDto.fromNetwork];

      if (!toAddressDeposit) {
        throw new NotFoundException('Deposit address not found');
      }

      const fromWallet = await this.walletService.findOneByUserIdAndIndex(
        createSpotMarketDto.userId,
        createSpotMarketDto.fromNetwork,
      );

      const toWallet = await this.walletService.findOneByUserIdAndIndex(
        createSpotMarketDto.userId,
        createSpotMarketDto.toNetwork,
      );

      const fromNetwork = fromWallet.network;

      const toNetwork = toWallet.network;

      if (!fromNetwork.isActive || !toNetwork.isActive) {
        throw new NotFoundException('Network is not active');
      }

      const fromIsNative = fromNetwork.symbol === createSpotMarketDto.fromCoin;

      const toIsNative = toNetwork.symbol === createSpotMarketDto.toCoin;

      if (!toIsNative) {
        const toToken = await this.tokenService.findOneBySymbolNetworkId(createSpotMarketDto.toCoin, toNetwork.id);

        if (!toToken) {
          throw new NotFoundException('Token not found');
        }
      }

      let exchangeType = ExchangeTypeEnum.EXCHANGE;

      if (fromNetwork.symbol === toNetwork.symbol) {
        exchangeType = ExchangeTypeEnum.SWAP;
      } else if (createSpotMarketDto.fromCoin === createSpotMarketDto.toCoin) {
        exchangeType = ExchangeTypeEnum.BRIGDE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(createSpotMarketDto.fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Deposit not enabled');
      }

      if (createSpotMarketDto.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('Amount is less than deposit dust');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(createSpotMarketDto.toCoin);

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

      if (exchangeType !== ExchangeTypeEnum.BRIGDE) {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === createSpotMarketDto.fromCoin && s.quoteAsset === createSpotMarketDto.toCoin) ||
            (s.baseAsset === createSpotMarketDto.toCoin && s.quoteAsset === createSpotMarketDto.fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (!symbol.orderTypes.includes(createSpotMarketDto.typeOrder)) {
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

        const side = createSpotMarketDto.fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

        const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

        let quantity = side === 'SELL' ? createSpotMarketDto.amount * price : createSpotMarketDto.amount / price;

        quantity = Math.floor(quantity / stepSize) * stepSize;

        console.log('quantity', quantity);

        const feeWallet = quantity * 0.002;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = quantity - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }
      } else {
        const feeWallet = createSpotMarketDto.amount * 0.001;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = createSpotMarketDto.amount - feeTotal;

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
          userId: createSpotMarketDto.userId,
          privateKey: createSpotMarketDto.privateKey,
          network: fromNetwork.index,
          toAddress: toAddressDeposit,
          amount: createSpotMarketDto.amount,
        };

        const transfer = await this.blockchainService.transfer(transferDto, false);

        hash = transfer.hash;
      } else {
        const fromToken = await this.tokenService.findOneBySymbolNetworkId(
          createSpotMarketDto.fromCoin,
          fromNetwork.id,
        );

        if (!fromToken) {
          throw new NotFoundException('Token not found');
        }

        const transferTokenDto: TransferTokenDto = {
          userId: createSpotMarketDto.userId,
          privateKey: createSpotMarketDto.privateKey,
          network: fromNetwork.index,
          toAddress: toAddressDeposit,
          amount: createSpotMarketDto.amount,
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

      const spotMarketDto: SpotMarketDto = {
        userId: createSpotMarketDto.userId,
        orderType: createSpotMarketDto.typeOrder,
        fromNetwork: fromNetwork.index,
        toNetwork: toNetwork.index,
        fromCoin: createSpotMarketDto.fromCoin,
        toCoin: createSpotMarketDto.toCoin,
        amount: String(createSpotMarketDto.amount),
        hash: hash,
        exchangeType: exchangeType,
        status: SpotMarketStatusEnum.PENDING,
      };

      const spotMarket = await this.spotMarketRepository.create(spotMarketDto);

      return spotMarket;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async previewSpotMarket(previewSpotMarketDto: PreviewSpotMarketDto) {
    try {
      if (
        !Object.values(IndexEnum).includes(previewSpotMarketDto.fromNetwork) ||
        !Object.values(IndexEnum).includes(previewSpotMarketDto.toNetwork)
      ) {
        throw new ConflictException('Invalid network');
      }

      if (
        previewSpotMarketDto.fromNetwork === previewSpotMarketDto.toNetwork &&
        previewSpotMarketDto.fromCoin === previewSpotMarketDto.toCoin
      ) {
        throw new ConflictException(
          'The source and destination networks cannot be the same. Please select different networks for the transfer',
        );
      }

      const toAddressDeposit = DepositAddressEnum[previewSpotMarketDto.fromNetwork];

      if (!toAddressDeposit) {
        throw new NotFoundException('Deposit address not found');
      }

      const fromWallet = await this.walletService.findOneByUserIdAndIndex(
        previewSpotMarketDto.userId,
        previewSpotMarketDto.fromNetwork,
      );

      const toWallet = await this.walletService.findOneByUserIdAndIndex(
        previewSpotMarketDto.userId,
        previewSpotMarketDto.toNetwork,
      );

      const fromNetwork = fromWallet.network;

      const toNetwork = toWallet.network;

      if (!fromNetwork.isActive || !toNetwork.isActive) {
        throw new NotFoundException('Network is not active');
      }

      const fromIsNative = fromNetwork.symbol === previewSpotMarketDto.fromCoin;

      const toIsNative = toNetwork.symbol === previewSpotMarketDto.toCoin;

      if (!toIsNative) {
        const toToken = await this.tokenService.findOneBySymbolNetworkId(previewSpotMarketDto.toCoin, toNetwork.id);

        if (!toToken) {
          throw new NotFoundException('Token not found');
        }
      }

      let exchangeType = ExchangeTypeEnum.EXCHANGE;

      if (fromNetwork.symbol === toNetwork.symbol) {
        exchangeType = ExchangeTypeEnum.SWAP;
      } else if (previewSpotMarketDto.fromCoin === previewSpotMarketDto.toCoin) {
        exchangeType = ExchangeTypeEnum.BRIGDE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(previewSpotMarketDto.fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Deposit not enabled');
      }

      if (previewSpotMarketDto.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('Amount is less than deposit dust');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(previewSpotMarketDto.toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Network not found');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Withdraw not enabled');
      }

      if (exchangeType !== ExchangeTypeEnum.BRIGDE) {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === previewSpotMarketDto.fromCoin && s.quoteAsset === previewSpotMarketDto.toCoin) ||
            (s.baseAsset === previewSpotMarketDto.toCoin && s.quoteAsset === previewSpotMarketDto.fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        if (!symbol.orderTypes.includes(previewSpotMarketDto.typeOrder)) {
          throw new NotFoundException('Order type not found');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Pair not available');
        }
      } else {
        if (previewSpotMarketDto.amount < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min');
        }

        if (previewSpotMarketDto.amount > Number(toNetworkConfig.withdrawMax)) {
          throw new NotFoundException('Amount is greater than withdraw max');
        }
      }

      let feeDeposit = 0;

      if (fromIsNative) {
        feeDeposit = await this.blockchainService.getFeeTransfer(previewSpotMarketDto.userId, fromNetwork.index);
      } else {
        const fromToken = await this.tokenService.findOneBySymbolNetworkId(
          previewSpotMarketDto.fromCoin,
          fromNetwork.id,
        );

        if (!fromToken) {
          throw new NotFoundException('Token not found');
        }

        feeDeposit = await this.blockchainService.getFeeTransferToken(fromNetwork.index);
      }

      console.log('toNetworkConfig', toNetworkConfig);

      const feeWithdraw = Number(toNetworkConfig.withdrawFee);

      const fees = [
        {
          coin: fromNetwork.symbol,
          name: 'Deposit Fee',
          amount: feeDeposit,
        },
        {
          coin: previewSpotMarketDto.toCoin,
          name: 'Withdraw Fee',
          amount: feeWithdraw,
        },
      ];

      if (exchangeType === ExchangeTypeEnum.BRIGDE) {
        const feeWallet = previewSpotMarketDto.amount * 0.001;

        fees.push({
          coin: previewSpotMarketDto.toCoin,
          name: 'Wallet Fee',
          amount: feeWallet,
        });

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = previewSpotMarketDto.amount - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }

        return { amountReceived, fees };
      } else {
        const jsonData = JSON.parse(exchangeInfo);

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === previewSpotMarketDto.fromCoin && s.quoteAsset === previewSpotMarketDto.toCoin) ||
            (s.baseAsset === previewSpotMarketDto.toCoin && s.quoteAsset === previewSpotMarketDto.fromCoin),
        );

        console.log('symbol', symbol);

        if (!symbol?.symbol) {
          throw new NotFoundException('Pair not found');
        }

        const pair = symbol.symbol;

        const price = await this.binanceApiService.getTickerPrice(pair);

        const side = previewSpotMarketDto.fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

        let quantity = side === 'SELL' ? previewSpotMarketDto.amount * price : previewSpotMarketDto.amount / price;

        const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

        quantity = Math.floor(quantity / stepSize) * stepSize;

        console.log('quantity', quantity);

        const feeWallet = quantity * 0.002;

        fees.push({
          coin: previewSpotMarketDto.toCoin,
          name: 'Wallet Fee',
          amount: feeWallet,
        });

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = quantity - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min, after fees');
        }

        return { amountReceived, fees };
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
