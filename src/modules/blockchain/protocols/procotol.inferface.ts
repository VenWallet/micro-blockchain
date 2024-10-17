import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';

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
}
