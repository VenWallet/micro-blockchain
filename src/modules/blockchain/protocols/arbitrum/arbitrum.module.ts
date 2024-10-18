import { Module } from '@nestjs/common';
import { ArbitrumService } from './arbitrum.service';
import { ArbitrumUtils } from './arbitrum.utils';

@Module({
  imports: [],
  exports: [ArbitrumService, ArbitrumUtils],
  controllers: [],
  providers: [ArbitrumService, ArbitrumUtils],
})
export class ArbitrumModule {}
