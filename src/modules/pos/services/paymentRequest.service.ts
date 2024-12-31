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
  ) {}

  async createPaymentRequest(createPaymentRequestDto: PaymentRequestDto) {
    try {
      const network = await this.networkRepository.findOneByIndex(createPaymentRequestDto.network as IndexEnum);

      if (!network) {
        throw new NotFoundException('Network not found');
      }

      const paymentRequestDto = {
        ...createPaymentRequestDto,
        network: network.id,
      };

      const paymentRequest = await this.paymentRequestRepository.create(paymentRequestDto);

      return paymentRequest;
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

      const userWallet = await this.walletService.findOneByUserIdAndIndex(
        paymentRequest.userId,
        paymentRequest.network.index,
      );

      let hash: string | undefined;

      if (isNative) {
        const transferDto: TransferDto = {
          userId: paymentRequestPayDto.userId,
          privateKey: paymentRequestPayDto.privateKey,
          network: paymentRequest.network.index,
          toAddress: userWallet.address,
          amount: paymentRequest.amount,
        };

        const transfer = await this.blockchainService.transfer(transferDto, false);

        hash = transfer.hash;
      } else {
        const fromToken = await this.tokenService.findOneBySymbolNetworkId(
          paymentRequest.token.tokenData.symbol,
          paymentRequest.network.id,
        );

        if (!fromToken) {
          throw new NotFoundException('Token not found');
        }

        const transferTokenDto: TransferTokenDto = {
          userId: paymentRequestPayDto.userId,
          privateKey: paymentRequestPayDto.privateKey,
          network: paymentRequest.network.index,
          toAddress: userWallet.address,
          amount: paymentRequest.amount,
          token: fromToken.id,
        };

        console.log('transferTokenDto', transferTokenDto);

        const transferToken = await this.blockchainService.transferToken(transferTokenDto, false);

        hash = transferToken.hash;
      }

      if (!hash) {
        throw new InternalServerErrorException('Hash not found');
      }

      await this.paymentRequestRepository.update(paymentRequest.id, { isPaid: true, hash });

      await this.posSocket.emitEvent(
        paymentRequest.socketId,
        'payment-request:pay-status',
        await this.paymentRequestRepository.findOne(paymentRequestPayDto.paymentRequestId),
      );

      return hash;
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
      const network = await this.networkRepository.findOneByIndex(getAmountMinMaxDto.network as IndexEnum);

      if (!network) {
        throw new NotFoundException('Network not found');
      }

      let toNetwork;
      let toCoin;

      const posLinked = await this.posLinkRepository.findOneByUserId(getAmountMinMaxDto.userId);

      if (posLinked) {
        const posSettings = await this.posSettingsRepository.findOneByUserId(posLinked.userId);

        if (!posSettings) {
          throw new NotFoundException('PosSettings not found');
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

      console.log('toNetwork', toNetwork);
      console.log('toCoin', toCoin);

      // const isNative: boolean = getAmountMinMaxDto.token ? false : true;

      // let exchangeType = ExchangeTypeEnum.EXCHANGE;

      // if (network.symbol === toNetwork.symbol) {
      //   exchangeType = ExchangeTypeEnum.SWAP;
      // } else if (previewSpotMarketDto.fromCoin === previewSpotMarketDto.toCoin) {
      //   exchangeType = ExchangeTypeEnum.BRIGDE;
      // }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
