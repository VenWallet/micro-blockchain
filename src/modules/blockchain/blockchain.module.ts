import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { WalletModule } from '../wallet/wallet.module';
import { NetworkModule } from '../network/network.module';
import { ProtocolModule } from './protocols/protocol.module';
import { TokenModule } from '../token/token.module';
import { ExternalModule } from 'src/external/external.module';

@Module({
  imports: [WalletModule, NetworkModule, ProtocolModule, TokenModule, ExternalModule],
  exports: [BlockchainService],
  controllers: [BlockchainController],
  providers: [BlockchainService],
})
export class BlockchainModule {}
