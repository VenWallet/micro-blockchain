import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceUtils } from './binance.utils';

@Module({
  imports: [],
  exports: [BinanceService, BinanceUtils],
  controllers: [],
  providers: [BinanceService, BinanceUtils],
})
export class BinanceModule {}
