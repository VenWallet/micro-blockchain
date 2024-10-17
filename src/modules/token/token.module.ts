import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenService } from './token.service';
import { TokenRepository } from './repositories/token.repository';
import { TokenController } from './token.controller';
import { TokenEntity } from './entities/token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity])],
  exports: [TokenService, TokenRepository],
  controllers: [TokenController],
  providers: [TokenService, TokenRepository],
})
export class TokenModule {}
