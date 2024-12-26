import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSettingsEntity } from './entities/posSettings.entity';
import { PosSettingsService } from './services/posSettings.service';
import { PosSettingsRepository } from './repositories/posSettings.repository';
import { PosSettingsController } from './controllers/pos.controller';
import { PaymentRequestRepository } from './repositories/paymentRequest.repository';
import { PaymentRequestService } from './services/paymentRequest.service';
import { PosLinkRepository } from './repositories/posLink.repository';
import { PosLinkService } from './services/posLink.service';
import { PosLinkEntity } from './entities/posLink.entity';
import { PaymentRequestEntity } from './entities/paymentRequest.entity';
import { PaymentRequestSocket } from './sockets/paymentRequest.socket';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TokenModule } from '../token/token.module';
import { WalletModule } from '../wallet/wallet.module';
import { PosLinkSocket } from './sockets/posLink.socket';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosSettingsEntity, PosLinkEntity, PaymentRequestEntity]),
    BlockchainModule,
    TokenModule,
    WalletModule,
  ],
  exports: [
    PosSettingsService,
    PosSettingsRepository,
    PaymentRequestRepository,
    PaymentRequestService,
    PosLinkRepository,
    PosLinkService,
    PaymentRequestSocket,
    PosLinkSocket,
  ],
  controllers: [PosSettingsController],
  providers: [
    PosSettingsService,
    PosSettingsRepository,
    PaymentRequestRepository,
    PaymentRequestService,
    PosLinkRepository,
    PosLinkService,
    PaymentRequestSocket,
    PosLinkSocket,
  ],
})
export class PosSettingsModule {}
