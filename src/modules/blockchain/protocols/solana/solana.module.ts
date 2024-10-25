import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';

@Module({
  imports: [],
  exports: [SolanaService],
  controllers: [],
  providers: [SolanaService],
})
export class SolanaModule {}
