import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpCustomService } from './http.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [HttpCustomService],
  exports: [HttpCustomModule, HttpModule, HttpCustomService],
})
export class HttpCustomModule {}
