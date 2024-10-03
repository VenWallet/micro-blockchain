import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainsService } from './blockchains.service';
import { BlockchainsController } from './blockchains.controller';

@Module({
  imports: [],
  exports: [BlockchainsService],
  controllers: [BlockchainsController],
  providers: [BlockchainsService],
})
export class BlockchainsModule {}
