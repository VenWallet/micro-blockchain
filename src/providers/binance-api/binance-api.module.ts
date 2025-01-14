import { Module } from '@nestjs/common';
import { BinanceApiService } from './binance-api.service';
import { HttpCustomModule } from 'src/shared/http/http.module';

@Module({
  imports: [HttpCustomModule],
  exports: [BinanceApiService, HttpCustomModule],
  controllers: [],
  providers: [BinanceApiService],
})
export class BinanceApiModule {}
