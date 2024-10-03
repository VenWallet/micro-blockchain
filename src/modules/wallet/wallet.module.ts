import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';
import { NetworkModule } from '../network/network.module';
import { BlockchainsModule } from 'src/blockchains/blockchains.module';
import { WalletController } from './wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity]), NetworkModule, BlockchainsModule],
  exports: [WalletService, WalletRepository],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
})
export class WalletModule {}
