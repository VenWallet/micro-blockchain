import { Module } from '@nestjs/common';
import { NearService } from './near.service';
import { AccountService } from './account.service';
import { NearUtils } from './near.utils';
import { WalletModule } from 'src/modules/wallet/wallet.module';

@Module({
  imports: [WalletModule],
  exports: [NearService, AccountService, NearUtils],
  controllers: [],
  providers: [NearService, AccountService, NearUtils],
})
export class NearModule {}
