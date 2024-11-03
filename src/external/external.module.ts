import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreService } from './core.service';

@Module({
  imports: [],
  exports: [CoreService],
  controllers: [],
  providers: [CoreService],
})
export class ExternalModule {}
