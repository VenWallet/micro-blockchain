import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config/database/typeorm.config';
import { NetworkModule } from './modules/network/network.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AppConfigModule } from './config/app.config';
import { AppController } from './app.controller';
import { BlockchainsController } from './modules/blockchains/blockchains.controller';
import { BlockchainsModule } from './modules/blockchains/blockchains.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRoot(config),
    NetworkModule,
    WalletModule,
    BlockchainsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
