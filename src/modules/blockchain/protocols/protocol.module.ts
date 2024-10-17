import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Near } from 'near-api-js';
import { NearModule } from './near/near.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { BinanceModule } from './binance/binance.module';

@Module({
  imports: [NearModule, EthereumModule, BinanceModule],
  exports: [NearModule, EthereumModule, BinanceModule],
  controllers: [],
  providers: [],
})
export class ProtocolModule {}
