import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreService } from './core.service';
import { HttpCustomModule } from 'src/shared/http/http.module';

@Module({
  imports: [HttpCustomModule],
  exports: [CoreService],
  controllers: [],
  providers: [CoreService],
})
export class ExternalModule {}
