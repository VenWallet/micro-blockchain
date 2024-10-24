import { Module } from '@nestjs/common';
import { TronService } from './tron.service';

@Module({
  imports: [],
  exports: [TronService],
  controllers: [],
  providers: [TronService],
})
export class TronModule {}
