import { Module } from '@nestjs/common';
import { EthereumService } from './ethereum.service';
import { EthereumUtils } from './ethereum.utils';

@Module({
  imports: [],
  exports: [EthereumService, EthereumUtils],
  controllers: [],
  providers: [EthereumService, EthereumUtils],
})
export class EthereumModule {}
