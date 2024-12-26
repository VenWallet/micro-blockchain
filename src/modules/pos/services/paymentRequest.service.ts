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
import { PaymentRequestDto, PaymentRequestPayDto, PosSettingsDto, UpdatePosSettingsDto } from '../dto/pos.dto';
import { PaymentRequestRepository } from '../repositories/paymentRequest.repository';
import { PaymentStatusEnum } from '../enums/paymentStatus.enum';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { TransferDto, TransferTokenDto } from 'src/modules/blockchain/blockchain.dto';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TokenService } from 'src/modules/token/token.service';

@Injectable()
export class PaymentRequestService {
  constructor(
    private readonly paymentRequestRepository: PaymentRequestRepository,
    private readonly blockchainService: BlockchainService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
  ) {}

  async createPaymentRequest(createPaymentRequestDto: PaymentRequestDto) {
    try {
      const paymentRequest = await this.paymentRequestRepository.create(createPaymentRequestDto);

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

      const isNative: boolean = !!paymentRequest.token;

      const userWallet = await this.walletService.findOneByUserIdAndIndex(
        paymentRequestPayDto.userId,
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

      await this.paymentRequestRepository.update(paymentRequest.id, { status: PaymentStatusEnum.PAID, hash });

      return hash;
    } catch (error) {
      await this.paymentRequestRepository.update(paymentRequest.id, { status: PaymentStatusEnum.FAILED });
      throw new ExceptionHandler(error);
    }
  }
}
