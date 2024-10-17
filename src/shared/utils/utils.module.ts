import { Global, Module } from '@nestjs/common';
import { UtilsShared } from './utils.shared';

@Global()
@Module({
  imports: [],
  providers: [UtilsShared],
  exports: [UtilsShared],
})
export class UtilsModule {}
