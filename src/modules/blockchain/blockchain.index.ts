import { Injectable } from '@nestjs/common';
import { IndexEnum } from '../network/enums/index.enum';
import { NearService } from './protocols/near/near.service';
import { EthereumService } from './protocols/ethereum/ethereum.service';

@Injectable()
export class BlockchainIndexService {
  constructor(
    private readonly nearService: NearService,
    private readonly ethereumService: EthereumService,
  ) {}

  private blockchainIndex = {
    [IndexEnum.NEAR]: this.nearService,
    [IndexEnum.ETHEREUM]: this.ethereumService,
  };

  getBlockchainService(index: IndexEnum) {
    return this.blockchainIndex[index];
  }

  getBlockchainIndex() {
    return this.blockchainIndex;
  }
}
