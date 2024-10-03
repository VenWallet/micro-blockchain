import { Module } from '@nestjs/common';
import { NearService } from './near.service';
import { AccountService } from './account.service';

@Module({
  imports: [],
  exports: [NearService, AccountService],
  controllers: [],
  providers: [NearService, AccountService],
})
export class NearModule {}
