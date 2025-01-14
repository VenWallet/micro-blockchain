import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpCustomService } from './http.service';
import { HttpClient } from './http.client';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [HttpCustomService],
  exports: [HttpCustomModule, HttpModule, HttpCustomService],
})
export class HttpCustomModule {}
