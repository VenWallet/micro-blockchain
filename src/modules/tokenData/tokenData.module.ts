import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenDataService } from './tokenData.service';
import { TokenDataRepository } from './repositories/tokenData.repository';
import { TokenDataController } from './tokenData.controller';
import { TokenDataEntity } from './entities/tokenData.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenDataEntity])],
  exports: [TokenDataService, TokenDataRepository],
  controllers: [TokenDataController],
  providers: [TokenDataService, TokenDataRepository],
})
export class TokenDataModule {}
