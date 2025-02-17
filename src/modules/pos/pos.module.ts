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
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TokenModule } from '../token/token.module';
import { WalletModule } from '../wallet/wallet.module';
import { NetworkModule } from '../network/network.module';
import { BinanceApiModule } from 'src/providers/binance-api/binance-api.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosSettingsEntity, PosLinkEntity, PaymentRequestEntity]),
    BlockchainModule,
    TokenModule,
    WalletModule,
    NetworkModule,
    BinanceApiModule,
    forwardRef(() => WebsocketModule),
  ],
  exports: [
    PosSettingsService,
    PosSettingsRepository,
    PaymentRequestRepository,
    PaymentRequestService,
    PosLinkRepository,
    PosLinkService,
  ],
  controllers: [PosSettingsController],
  providers: [
    PosSettingsService,
    PosSettingsRepository,
    PaymentRequestRepository,
    PaymentRequestService,
    PosLinkRepository,
    PosLinkService,
  ],
})
export class PosModule {}
