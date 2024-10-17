import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';
import { NetworkModule } from '../network/network.module';
import { WalletController } from './wallet.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity]), NetworkModule],
  exports: [WalletService, WalletRepository],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
})
export class WalletModule {}
