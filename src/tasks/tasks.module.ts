import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { HttpCustomModule } from 'src/shared/http/http.module';
import { SpotMarketModule } from 'src/modules/spotMarket/spotMarket.module';
import { WalletModule } from 'src/modules/wallet/wallet.module';
import { BinanceApiModule } from 'src/providers/binance-api/binance-api.module';
import { PosModule } from 'src/modules/pos/pos.module';
import { PosTask } from './pos.task';

@Module({
  imports: [HttpCustomModule, SpotMarketModule, WalletModule, BinanceApiModule, PosModule],
  controllers: [],
  providers: [TasksService],
})
export class TasksModule {}
