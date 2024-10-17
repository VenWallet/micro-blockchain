import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Near } from 'near-api-js';
import { NearModule } from './near/near.module';
import { EthereumModule } from './ethereum/ethereum.module';

@Module({
  imports: [NearModule, EthereumModule],
  exports: [NearModule, EthereumModule],
  controllers: [],
  providers: [],
})
export class ProtocolModule {}
