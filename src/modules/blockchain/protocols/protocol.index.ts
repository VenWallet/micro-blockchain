import { Injectable } from '@nestjs/common';
import { IndexEnum } from '../../network/enums/index.enum';
import { NearService } from './near/near.service';
import { EthereumService } from './ethereum/ethereum.service';
import { BinanceService } from './binance/binance.service';
import { ArbitrumService } from './arbitrum/arbitrum.service';
import { TronService } from './tron/tron.service';
import { BitcoinService } from './bitcoin/bitcoin.service';
import { SolanaService } from './solana/solana.service';

@Injectable()
export class ProtocolIndex {
  constructor(
    private readonly nearService: NearService,
    private readonly ethereumService: EthereumService,
    private readonly binanceService: BinanceService,
    private readonly arbitrumService: ArbitrumService,
    private readonly tronService: TronService,
    private readonly bitcoinService: BitcoinService,
    private readonly solanaService: SolanaService,
  ) {}

  private protocolIndex = {
    [IndexEnum.NEAR]: this.nearService,
    [IndexEnum.ETHEREUM]: this.ethereumService,
    [IndexEnum.BSC]: this.binanceService,
    [IndexEnum.ARBITRUM]: this.arbitrumService,
    [IndexEnum.TRON]: this.tronService,
    [IndexEnum.BITCOIN]: this.bitcoinService,
    [IndexEnum.SOLANA]: this.solanaService,
  };

  getProtocolService(index: IndexEnum) {
    return this.protocolIndex[index];
  }

  getProtocolIndex() {
    return this.protocolIndex;
  }
}
