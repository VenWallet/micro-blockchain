import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Near } from 'near-api-js';
import { NearModule } from './near/near.module';
import { EthereumModule } from './ethereum/ethereum.module';
import { BinanceModule } from './binance/binance.module';
import { ArbitrumModule } from './arbitrum/arbitrum.module';
import { TronModule } from './tron/tron.module';
import { BitcoinModule } from './bitcoin/bitcoin.module';
import { SolanaModule } from './solana/solana.module';
import { ProtocolIndex } from './protocol.index';

@Module({
  imports: [NearModule, EthereumModule, BinanceModule, ArbitrumModule, TronModule, BitcoinModule, SolanaModule],
  exports: [
    ProtocolIndex,
    NearModule,
    EthereumModule,
    BinanceModule,
    ArbitrumModule,
    TronModule,
    BitcoinModule,
    SolanaModule,
  ],
  controllers: [],
  providers: [ProtocolIndex],
})
export class ProtocolModule {}
