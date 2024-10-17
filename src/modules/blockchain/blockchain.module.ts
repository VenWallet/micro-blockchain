import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { WalletModule } from '../wallet/wallet.module';
import { NetworkModule } from '../network/network.module';
import { BlockchainIndexService } from './blockchain.index';
import { ProtocolModule } from './protocols/protocol.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [WalletModule, NetworkModule, ProtocolModule, TokenModule],
  exports: [BlockchainService],
  controllers: [BlockchainController],
  providers: [BlockchainService, BlockchainIndexService],
})
export class BlockchainModule {}
