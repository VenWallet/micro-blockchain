import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSettingsEntity } from './entities/posSettings.entity';
import { PosSettingsService } from './services/posSettings.service';
import { PosSettingsRepository } from './repositories/posSettings.repository';
import { PosSettingsController } from './controllers/pos.controller';
import { PaymentRequestRepository } from './repositories/paymentRequest.repository';
import { PaymentRequestService } from './services/paymentRequest.service';
import { PosLinkRepository } from './repositories/PosLink.repository';
import { PosLinkService } from './services/posLink.service';
import { PosLinkEntity } from './entities/PosLink.entity';
import { PaymentRequestEntity } from './entities/paymentRequest.entity';
import { PaymentRequestSocket } from './paymentRequest.socket';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TokenModule } from '../token/token.module';
import { WalletModule } from '../wallet/wallet.module';

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
  ],
})
export class PosSettingsModule {}
