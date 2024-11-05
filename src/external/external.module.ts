import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreServiceExternal } from './core-service.external';
import { HttpCustomModule } from 'src/shared/http/http.module';

@Module({
  imports: [HttpCustomModule],
  exports: [CoreServiceExternal],
  controllers: [],
  providers: [CoreServiceExternal],
})
export class ExternalModule {}
