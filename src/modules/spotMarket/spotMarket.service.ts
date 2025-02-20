import {
  BadRequestException,
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
import { IndexEnum } from '../network/enums/index.enum';
import { NetworkService } from '../network/network.service';
import { CreateSpotMarketDto, PreviewSpotMarketDto, SpotMarketDto, CancelLimitOrderDto } from './dto/spotMarket.dto';
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
import { OrderTypeEnum } from './enums/orderType.enum';
import { parse } from 'json2csv';
import { Response } from 'express';
import axios from 'axios';

// const filePath = path.resolve(process.cwd(), 'exchangeInfo.json');
// const exchangeInfo = fs.readFileSync(filePath, 'utf8');

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
        exchangeType = ExchangeTypeEnum.BRIDGE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(createSpotMarketDto.fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Red no encontrada');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Depósito no habilitado');
      }

      if (createSpotMarketDto.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('El monto es menor que el depósito mínimo');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(createSpotMarketDto.toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Red no encontrada');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Retiro no habilitado');
      }

      const feeWithdraw = Number(toNetworkConfig.withdrawFee);

      if (exchangeType !== ExchangeTypeEnum.BRIDGE) {
        // const jsonData = JSON.parse(exchangeInfo);
        const jsonData = await this.binanceApiService.getExchangeInfo();

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === createSpotMarketDto.fromCoin && s.quoteAsset === createSpotMarketDto.toCoin) ||
            (s.baseAsset === createSpotMarketDto.toCoin && s.quoteAsset === createSpotMarketDto.fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Par no encontrado');
        }

        if (!symbol.orderTypes.includes(createSpotMarketDto.typeOrder)) {
          throw new NotFoundException('Tipo de pedido no encontrado');
        }

        if (!symbol?.symbol) {
          throw new NotFoundException('Par no encontrado');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Par no disponible');
        }

        const pair = symbol.symbol;

        const price =
          createSpotMarketDto.typeOrder === OrderTypeEnum.LIMIT && createSpotMarketDto.price
            ? createSpotMarketDto.price
            : await this.binanceApiService.getTickerPrice(pair);

        if (OrderTypeEnum.LIMIT && createSpotMarketDto.price) {
          const priceFilter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
          const percentPriceFilter = symbol.filters.find((f) => f.filterType === 'PERCENT_PRICE_BY_SIDE');

          const avgPrice = await this.getAvgPrice(symbol.symbol);

          const minPrice = parseFloat(priceFilter.minPrice);
          const maxPrice = parseFloat(priceFilter.maxPrice);
          const tickSize = parseFloat(priceFilter.tickSize);

          const minAllowedPrice = avgPrice * parseFloat(percentPriceFilter.askMultiplierDown);
          const maxAllowedPrice = avgPrice * parseFloat(percentPriceFilter.askMultiplierUp);

          // Validar precio dentro del rango permitido
          if (price < minPrice || price > maxPrice) {
            console.error(`Error: Precio fuera de los límites (${minPrice} - ${maxPrice})`);
            throw new HttpException(`Precio fuera de los límites (${minPrice} - ${maxPrice})`, HttpStatus.BAD_REQUEST);
          }

          if (price < minAllowedPrice || price > maxAllowedPrice) {
            console.error(
              `Error: Precio fuera del rango permitido por PERCENT_PRICE_BY_SIDE (${minAllowedPrice} - ${maxAllowedPrice})`,
            );
            throw new HttpException(
              `Precio fuera del rango permitido por PERCENT_PRICE_BY_SIDE (${minAllowedPrice} - ${maxAllowedPrice})`,
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        const side = createSpotMarketDto.fromCoin === symbol.baseAsset ? 'SELL' : 'BUY';

        const stepSize = parseFloat(symbol.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize || '0.1');

        let quantity = side === 'SELL' ? createSpotMarketDto.amount * price : createSpotMarketDto.amount / price;

        quantity = Math.floor(quantity / stepSize) * stepSize;

        console.log('quantity', quantity);

        // 📌 Extraer filtros dinámicamente desde symbol
        const minNotional = parseFloat(symbol.filters.find((f) => f.filterType === 'NOTIONAL')?.minNotional || '0');
        const lotSizeFilter = symbol.filters.find((f) => f.filterType === 'LOT_SIZE');
        const minQty = parseFloat(lotSizeFilter?.minQty || '0');
        const stepSize2 = parseFloat(lotSizeFilter?.stepSize || '0');
        const priceFilter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
        const minPrice = parseFloat(priceFilter?.minPrice || '0');

        if (side === 'SELL' ? quantity < minNotional : quantity * price < minNotional) {
          throw new BadRequestException(
            `Cantidad demasiado baja. Debe ser al menos ${side === 'SELL' ? Number((minNotional * 1.05 * price).toFixed(2)) + 1 : minNotional + 1} ${side === 'BUY' ? symbol.quoteAsset : symbol.baseAsset}`,
          );
        }

        // 🔄 Ajustar cantidad al múltiplo más cercano de stepSize
        if (stepSize2 > 0) {
          quantity = Math.floor(quantity / stepSize2) * stepSize2;
        }

        // ⚠️ Validar minQty (cantidad mínima permitida)
        if (quantity < minQty) {
          throw new Error(`La cantidad mínima permitida es ${minQty}`);
        }

        // ⚠️ Validar minPrice (precio mínimo permitido)
        if (price < minPrice) {
          throw new Error(`El precio mínimo permitido es ${minPrice}`);
        }

        const feeWallet = quantity * 0.002;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = quantity - feeTotal;

        console.log('quantity', quantity);
        console.log('feeTotal', feeTotal);
        console.log('amountReceived', amountReceived);

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException(
            `El monto final es menor que el mínimo de retiro de ${toNetworkConfig.withdrawMin} ${toNetworkConfig.coin}`,
          );
        }
      } else {
        const feeWallet = createSpotMarketDto.amount * 0.001;

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = createSpotMarketDto.amount - feeTotal;

        console.log('feeTotal', feeTotal);
        console.log('amountReceived', amountReceived);

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException(
            `El monto final es menor que el mínimo de retiro de ${toNetworkConfig.withdrawMin} ${toNetworkConfig.coin}`,
          );
        }

        if (amountReceived > Number(toNetworkConfig.withdrawMax)) {
          throw new NotFoundException('El monto es mayor que el máximo de retiro');
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

      if (createSpotMarketDto.typeOrder === OrderTypeEnum.LIMIT && createSpotMarketDto.price) {
        spotMarketDto.price = String(createSpotMarketDto.price);
      }

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
        exchangeType = ExchangeTypeEnum.BRIDGE;
      }

      const fromCoinConfig = await this.binanceApiService.getAssetConfig(previewSpotMarketDto.fromCoin);

      const networkSymbol =
        fromNetwork.symbol === 'BNB' ? 'BSC' : fromNetwork.symbol === 'ARB' ? 'ARBITRUM' : fromNetwork.symbol;

      const fromNetworkConfig = fromCoinConfig.networkList.find((n) => n.network === networkSymbol);

      if (!fromNetworkConfig) {
        throw new NotFoundException('Red no encontrada');
      }

      if (!fromNetworkConfig.depositEnable) {
        throw new NotFoundException('Depósito no habilitado');
      }

      if (previewSpotMarketDto.amount < fromNetworkConfig.depositDust) {
        throw new NotFoundException('El monto es menor que el depósito mínimo');
      }

      ///////////////////////////////////////////////////

      const toCoinConfig = await this.binanceApiService.getAssetConfig(previewSpotMarketDto.toCoin);

      const toNetworkSymbol =
        toNetwork.symbol === 'BNB' ? 'BSC' : toNetwork.symbol === 'ARB' ? 'ARBITRUM' : toNetwork.symbol;

      const toNetworkConfig = toCoinConfig.networkList.find((n) => n.network === toNetworkSymbol);

      if (!toNetworkConfig) {
        throw new NotFoundException('Red no encontrada');
      }

      if (!toNetworkConfig.withdrawEnable) {
        throw new NotFoundException('Retiro no habilitado');
      }

      if (exchangeType !== ExchangeTypeEnum.BRIDGE) {
        // const jsonData = JSON.parse(exchangeInfo);
        const jsonData = await this.binanceApiService.getExchangeInfo();

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === previewSpotMarketDto.fromCoin && s.quoteAsset === previewSpotMarketDto.toCoin) ||
            (s.baseAsset === previewSpotMarketDto.toCoin && s.quoteAsset === previewSpotMarketDto.fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Par no encontrado');
        }

        if (!symbol.orderTypes.includes(previewSpotMarketDto.typeOrder)) {
          throw new NotFoundException('Tipo de pedido no encontrado');
        }

        if (symbol.status !== 'TRADING') {
          throw new NotFoundException('Par no disponible');
        }
      } else {
        if (previewSpotMarketDto.amount < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException('Amount is less than withdraw min');
        }

        if (previewSpotMarketDto.amount > Number(toNetworkConfig.withdrawMax)) {
          throw new NotFoundException('El monto es mayor que el máximo de retiro');
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

      if (exchangeType === ExchangeTypeEnum.BRIDGE) {
        const feeWallet = previewSpotMarketDto.amount * 0.001;

        fees.push({
          coin: previewSpotMarketDto.toCoin,
          name: 'Wallet Fee',
          amount: feeWallet,
        });

        const feeTotal = feeWithdraw + feeWallet;

        const amountReceived = previewSpotMarketDto.amount - feeTotal;

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException(
            `El monto final es menor que el mínimo de retiro de ${toNetworkConfig.withdrawMin} ${toNetworkConfig.coin}`,
          );
        }

        return { amountReceived, fees };
      } else {
        // const jsonData = JSON.parse(exchangeInfo);
        const jsonData = await this.binanceApiService.getExchangeInfo();

        const symbol = jsonData.symbols.find(
          (s) =>
            (s.baseAsset === previewSpotMarketDto.fromCoin && s.quoteAsset === previewSpotMarketDto.toCoin) ||
            (s.baseAsset === previewSpotMarketDto.toCoin && s.quoteAsset === previewSpotMarketDto.fromCoin),
        );

        if (!symbol?.symbol) {
          throw new NotFoundException('Par no encontrado');
        }

        const pair = symbol.symbol;

        const price =
          previewSpotMarketDto.typeOrder === OrderTypeEnum.LIMIT && previewSpotMarketDto.price
            ? previewSpotMarketDto.price
            : await this.binanceApiService.getTickerPrice(pair);

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

        console.log('quantity', quantity);
        console.log('feeTotal', feeTotal);
        console.log('amountReceived', amountReceived);

        if (amountReceived < Number(toNetworkConfig.withdrawMin)) {
          throw new NotFoundException(
            `El monto final es menor que el mínimo de retiro de ${toNetworkConfig.withdrawMin} ${toNetworkConfig.coin}`,
          );
        }

        if (OrderTypeEnum.LIMIT && previewSpotMarketDto.price) {
          console.log('ENTRO');
          const priceFilter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
          const percentPriceFilter = symbol.filters.find((f) => f.filterType === 'PERCENT_PRICE_BY_SIDE');

          const avgPrice = await this.getAvgPrice(symbol.symbol);

          const minPrice = parseFloat(priceFilter.minPrice);
          const maxPrice = parseFloat(priceFilter.maxPrice);
          const tickSize = parseFloat(priceFilter.tickSize);

          const minAllowedPrice = avgPrice * parseFloat(percentPriceFilter.askMultiplierDown);
          const maxAllowedPrice = avgPrice * parseFloat(percentPriceFilter.askMultiplierUp);

          console.log('minAllowedPrice', minAllowedPrice);
          console.log('maxAllowedPrice', maxAllowedPrice);
          // Validar precio dentro del rango permitido
          if (price < minPrice || price > maxPrice) {
            console.error(`Error: Precio fuera de los límites (${minPrice} - ${maxPrice})`);
            throw new HttpException(`Precio fuera de los límites (${minPrice} - ${maxPrice})`, HttpStatus.BAD_REQUEST);
          }

          console.log('price', price);

          if (price < minAllowedPrice || price > maxAllowedPrice) {
            console.log('ENTRO 1');
            console.error(
              `Error: Precio fuera del rango permitido por PERCENT_PRICE_BY_SIDE (${minAllowedPrice} - ${maxAllowedPrice})`,
            );
            throw new HttpException(
              `Precio fuera del rango permitido por PERCENT_PRICE_BY_SIDE (${minAllowedPrice} - ${maxAllowedPrice})`,
              HttpStatus.BAD_REQUEST,
            );
          }

          console.log('ENTRO 2');
        }
        console.log('ENTRO 3');
        // 📌 Extraer filtros dinámicamente desde symbol
        const minNotional = parseFloat(symbol.filters.find((f) => f.filterType === 'NOTIONAL')?.minNotional || '0');
        const lotSizeFilter = symbol.filters.find((f) => f.filterType === 'LOT_SIZE');
        const minQty = parseFloat(lotSizeFilter?.minQty || '0');
        const stepSize2 = parseFloat(lotSizeFilter?.stepSize || '0');
        const priceFilter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
        const minPrice = parseFloat(priceFilter?.minPrice || '0');

        console.log('ENTRO 4');

        console.log('minNotional', minNotional);
        console.log('quantity', quantity);
        console.log('price', price);
        console.log('side', side);

        if (side === 'SELL' ? quantity < minNotional : quantity * price < minNotional) {
          throw new BadRequestException(
            `Cantidad demasiado baja. Debe ser al menos ${side === 'SELL' ? Number((minNotional * 1.05 * price).toFixed(2)) + 1 : minNotional + 1} ${side === 'BUY' ? symbol.quoteAsset : symbol.baseAsset}`,
          );
        }

        console.log('ENTRO 5');

        // 🔄 Ajustar cantidad al múltiplo más cercano de stepSize
        if (stepSize2 > 0) {
          quantity = Math.floor(quantity / stepSize2) * stepSize2;
        }

        // ⚠️ Validar minQty (cantidad mínima permitida)
        if (quantity < minQty) {
          throw new BadRequestException(`La cantidad mínima permitida es ${minQty}`);
        }

        console.log('ENTRO 6');
        // ⚠️ Validar minPrice (precio mínimo permitido)
        if (price < minPrice) {
          throw new BadRequestException(`El precio mínimo permitido es ${minPrice}`);
        }

        return { amountReceived, fees };
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async cancelLimitOrder(cancelLimitOrderDto: CancelLimitOrderDto) {
    try {
      const spotMarket = await this.spotMarketRepository.findOne(cancelLimitOrderDto.spotMarketId);

      if (!spotMarket) {
        throw new NotFoundException('Spot market not found');
      }

      if (spotMarket.userId !== cancelLimitOrderDto.userId) {
        throw new ConflictException('User not authorized');
      }

      if (spotMarket.status !== SpotMarketStatusEnum.SCHEDULED) {
        throw new ConflictException('Spot market is not scheduled');
      }

      if (spotMarket.orderType !== OrderTypeEnum.LIMIT) {
        throw new ConflictException('Spot market is not a limit order');
      }

      if (!spotMarket.orderData?.orderId) {
        throw new NotFoundException('Order ID not found');
      }

      const fromWallet = await this.walletService.findOneByUserIdAndIndex(
        spotMarket.userId,
        spotMarket.fromNetwork as IndexEnum,
      );

      if (!fromWallet) {
        throw new NotFoundException('Wallet not found');
      }

      const result = await this.binanceApiService.cancelLimitOrder(spotMarket.symbol, spotMarket.orderData.orderId);

      console.log('result', result);

      if (result.status !== 'CANCELED') {
        throw new ConflictException('Order not canceled');
      }

      const toNetworkSymbol =
        fromWallet.network.symbol === 'BNB'
          ? 'BSC'
          : fromWallet.network.symbol === 'ARB'
            ? 'ARBITRUM'
            : fromWallet.network.symbol;

      setTimeout(async () => {
        try {
          const withdrawData = await this.binanceApiService.withdraw(
            spotMarket.fromCoin,
            fromWallet.address,
            Number(spotMarket.amount),
            toNetworkSymbol,
          );

          console.log('withdrawData', withdrawData);

          await this.spotMarketRepository.update(spotMarket.id, {
            status: SpotMarketStatusEnum.CANCELED,
            withdrawData: withdrawData,
          });

          console.log('Retiro ejecutado exitosamente.');
        } catch (error) {
          console.error('Error al ejecutar el retiro:', error);
        }
      }, 5000);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getUserSpotMarkets(filters: {
    userId: string;
    status?: SpotMarketStatusEnum;
    fromNetwork?: string;
    toNetwork?: string;
    fromCoin?: string;
    toCoin?: string;
    orderType?: OrderTypeEnum;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      return await this.spotMarketRepository.getUserSpotMarkets(filters);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async convertToCsv(data: any, res: Response): Promise<void> {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data available to convert to CSV.');
      }

      const fields = Object.keys(data[0]);
      const opts = { fields };

      const csv = parse(data, opts);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="spot_markets.csv"');

      res.send(csv);
    } catch (error) {
      console.error('Error converting to CSV:', error);
      throw new Error('Failed to convert data to CSV.');
    }
  }

  async getAvgPrice(symbol) {
    try {
      const response = await axios.get(`https://api.binance.com/api/v3/avgPrice?symbol=${symbol}`);
      return parseFloat(response.data.price);
    } catch (error) {
      throw error;
    }
  }
}
