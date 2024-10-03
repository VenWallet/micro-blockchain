import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainsService } from './blockchains.service';

@Module({
  imports: [],
  exports: [BlockchainsService],
  controllers: [],
  providers: [BlockchainsService],
})
export class BlockchainsModule {}
