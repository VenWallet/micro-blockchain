import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkEntity } from './entities/network.entity';
import { NetworkService } from './network.service';
import { NetworkRepository } from './repositories/network.repository';
import { NetworkController } from './network.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NetworkEntity])],
  exports: [NetworkService, NetworkRepository],
  controllers: [NetworkController],
  providers: [NetworkService, NetworkRepository],
})
export class NetworkModule {}
