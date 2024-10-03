import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/shared/handlers/exception.handler';
import { blockchainsIndex } from './blockchains.index';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';

@Injectable()
export class BlockchainsService {
  constructor() {} // private readonly walletRepository: WalletRepository,

  async getCredentialsByMnemonic(mnemonic: string): Promise<
    {
      name: string;
      address: string;
      privateKey: string;
    }[]
  > {
    try {
      const credentials: {
        name: string;
        address: string;
        privateKey: string;
      }[] = [];

      for (const [name, service] of Object.entries(blockchainsIndex)) {
        try {
          const credential = await service.fromMnemonic(mnemonic);
          credentials.push(credential);
        } catch (error) {
          console.error(`Failed to retrieve credentials for ${name}:`, error);
          throw new InternalServerErrorException(`Failed to retrieve credentials for ${name}`);
        }
      }

      return credentials;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string, network: NetworksEnum) {
    try {
      return await blockchainsIndex[network.toLowerCase()].isAddress(address);

      // for (const [name, service] of Object.entries(blockchainsIndex)) {
      //   try {
      //     const credential = await service.fromMnemonic(mnemonic);
      //     credentials.push(credential);
      //   } catch (error) {
      //     console.error(`Failed to retrieve credentials for ${name}:`, error);
      //     throw new InternalServerErrorException(`Failed to retrieve credentials for ${name}`);
      //   }
      // }

      // return credentials;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
