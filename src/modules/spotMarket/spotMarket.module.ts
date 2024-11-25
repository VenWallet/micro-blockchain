import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotMarketController } from './SpotMarket.controller';
import { WalletModule } from '../wallet/wallet.module';
import { NetworkModule } from '../network/network.module';
import { TokenModule } from '../token/token.module';
import { ExternalModule } from 'src/external/external.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { SpotMarketService } from './spotMarket.service';
import { SpotMarketEntity } from './entities/spotMarket.entity';
import { SpotMarketRepository } from './repositories/spotMarket.repository';
import { BinanceApiModule } from 'src/providers/binance-api/binance-api.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpotMarketEntity]),
    BlockchainModule,
    NetworkModule,
    WalletModule,
    TokenModule,
    BinanceApiModule,
  ],
  exports: [SpotMarketService, SpotMarketRepository],
  controllers: [SpotMarketController],
  providers: [SpotMarketService, SpotMarketRepository],
})
export class SpotMarketModule {}
