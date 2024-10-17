import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config/database/typeorm.config';
import { NetworkModule } from './modules/network/network.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AppConfigModule } from './config/app.config';
import { AppController } from './app.controller';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { TokenDataModule } from './modules/tokenData/tokenData.module';
import { TokenModule } from './modules/token/token.module';
import { UtilsModule } from './shared/utils/utils.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRoot(config),
    UtilsModule,
    NetworkModule,
    WalletModule,
    BlockchainModule,
    TokenDataModule,
    TokenModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
