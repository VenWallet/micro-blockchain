import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkModule } from './modules/network/network.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AppConfigModule } from './config/app.config';
import { AppController } from './app.controller';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { TokenDataModule } from './modules/tokenData/tokenData.module';
import { TokenModule } from './modules/token/token.module';
import { UtilsModule } from './shared/utils/utils.module';
import { DatabaseConfig } from './config/database/database.config';
import { HttpCustomModule } from './shared/http/http.module';
import { ExternalModule } from './external/external.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRoot(DatabaseConfig.getDataSourceOptions()),
    UtilsModule,
    HttpCustomModule,
    NetworkModule,
    WalletModule,
    BlockchainModule,
    TokenDataModule,
    TokenModule,
    ExternalModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
