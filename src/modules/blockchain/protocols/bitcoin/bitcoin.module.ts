import { Module } from '@nestjs/common';
import { BitcoinService } from './bitcoin.service';
import { BitcoinUtils } from './bitcoin.utils';
@Module({
  imports: [],
  exports: [BitcoinService, BitcoinUtils],
  controllers: [],
  providers: [BitcoinService, BitcoinUtils],
})
export class BitcoinModule {}
