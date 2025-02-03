import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { TokensEnum } from 'src/modules/tokenData/enums/tokens.enum';

export interface ProtocolInterface {
  fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }>;
  isAddress(address: string): Promise<boolean>;
  getBalance(address: string): Promise<number>;
  getBalanceToken(address: string, contractId: string, decimals: number): Promise<number>;
  transfer(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<string>;
  transferToken(
    fromAddress: string,
    privateKey: string,
    toAddress: string,
    amount: number,
    contract: string,
    decimals: number,
  ): Promise<string>;
  getFeeTransfer(amount?: number, address?: string): Promise<number>;
  getFeeTransferToken?(amount: number | undefined, address: string | undefined): Promise<number>;
  previewSwap?(fromToken: any, toToken: any, amount: number, address: string | undefined): Promise<any>;
  swap?(priceRoute: any, privateKey: string, address: string): Promise<{ dataSwap: any; priceRoute: any }>;
  transferNft(
    fromAddress: string,
    privateKey: string,
    tokenId: string,
    contract: string,
    destination: string,
  ): Promise<string>;
  getLinkTransaction(txId: string): string;
}
