import {
  ConflictException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { CreateWalletsDto, ImportWalletsDto, IsAddressDto, TransferDto, TransferTokenDto } from './blockchain.dto';
import { CryptShared } from 'src/shared/utils/crypt.shared';
import { IndexEnum } from '../network/enums/index.enum';
import { WalletService } from '../wallet/wallet.service';
import { NetworkService } from '../network/network.service';
import { ProtocolIndex } from './protocols/protocol.index';
import { TokenService } from '../token/token.service';
import { IndexTokenEnum } from '../tokenData/enums/indexToken.enum';
import { UtilsShared } from 'src/shared/utils/utils.shared';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly walletService: WalletService,
    private readonly networkService: NetworkService,
    private readonly protocolIndex: ProtocolIndex,
    private readonly tokenService: TokenService,
  ) {} //

  private async getCredentialsByMnemonic(mnemonic: string): Promise<
    {
      network: NetworksEnum;
      index: IndexEnum;
      address: string;
      privateKey: string;
    }[]
  > {
    try {
      const credentials: {
        network: NetworksEnum;
        index: IndexEnum;
        address: string;
        privateKey: string;
      }[] = [];

      for (const [name, service] of Object.entries(this.protocolIndex.getProtocolIndex())) {
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

  async createWallets(createWalletsDto: CreateWalletsDto) {
    try {
      // const mnemonic = CryptShared.decryptRsa(createWalletsDto.mnemonic);
      const mnemonic = createWalletsDto.mnemonic;

      const wallet = await this.walletService.getUserIdByMnemonic(createWalletsDto.mnemonic);

      if (wallet) {
        throw new ConflictException('User already exists');
      }

      const networks = await this.networkService.findAllActive();

      const wallets = await this.walletService.findByUserId(createWalletsDto.userId);

      const credentials = await this.getCredentialsByMnemonic(mnemonic);

      for (const credential of credentials) {
        const network = networks.find((network) => network.index === credential.index);

        if (!network) {
          throw new HttpException('Network not found', HttpStatus.NOT_FOUND);
        }

        const walletFound = wallets.find(
          (wallet) => wallet.address === credential.address && wallet.network.index === network.index,
        );

        if (!walletFound) {
          await this.walletService.create({
            address: credential.address,
            network: network.id,
            userId: createWalletsDto.userId,
          });
        }
      }

      return credentials;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async importWallets(importWalletsDto: ImportWalletsDto): Promise<
    {
      network: string;
      address: string;
      privateKey: string;
    }[]
  > {
    try {
      // const mnemonic = CryptShared.decryptRsa(importWalletsDto.mnemonic);
      const mnemonic = importWalletsDto.mnemonic;

      const userId = importWalletsDto.userId;

      const networks = await this.networkService.findAllActive();

      const wallets = await this.walletService.findByUserId(userId);

      const credentials = await this.getCredentialsByMnemonic(mnemonic);

      for (const credential of credentials) {
        const network = networks.find((network) => network.index === credential.index);

        if (!network) {
          throw new HttpException('Network not found', HttpStatus.NOT_FOUND);
        }

        const walletFound = wallets.find(
          (wallet) => wallet.address === credential.address && wallet.network.index === network.index,
        );

        if (!walletFound) {
          await this.walletService.create({
            address: credential.address,
            network: network.id,
            userId: userId,
          });
        }
      }

      return credentials;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(isAddressDto: IsAddressDto): Promise<boolean> {
    try {
      return await this.protocolIndex.getProtocolService(isAddressDto.network).isAddress(isAddressDto.address);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(
    userId: string,
    network: IndexEnum,
  ): Promise<{
    network: NetworksEnum;
    symbol: string;
    index: IndexEnum;
    balance: number;
    decimals: number;
  }> {
    try {
      const wallet = await this.walletService.findOneByUserIdAndIndex(userId, network);

      const service = this.protocolIndex.getProtocolService(network);

      const balance = await service.getBalance(wallet.address);

      return {
        network: wallet.network.name,
        symbol: wallet.network.symbol,
        index: wallet.network.index,
        balance,
        decimals: wallet.network.decimals,
      };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalanceToken(userId: string, network: IndexEnum, token: IndexTokenEnum) {
    try {
      const wallet = await this.walletService.findOneByUserIdAndIndex(userId, network);

      const service = this.protocolIndex.getProtocolService(network);

      const tokenFound = await this.tokenService.findOneByNetworkAndTokenIndex(network, token);

      const balance = await service.getBalanceToken(wallet.address, tokenFound.contract, tokenFound.decimals);

      return {
        network: wallet.network.name,
        indexNetwork: wallet.network.index,
        token: tokenFound.tokenData.name,
        index: tokenFound.tokenData.index,
        symbol: tokenFound.tokenData.symbol,
        balance,
        decimals: tokenFound.decimals,
      };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalances(userId: string): Promise<
    {
      network: NetworksEnum;
      index: IndexEnum;
      symbol: string;
      balance: number;
      tokens: {
        token: string;
        symbol: string;
        index: IndexTokenEnum;
        balance: number;
        decimals: number;
      }[];
    }[]
  > {
    try {
      const balances: {
        network: NetworksEnum;
        index: IndexEnum;
        symbol: string;
        balance: number;
        decimals: number;
        tokens: {
          token: string;
          symbol: string;
          index: IndexTokenEnum;
          balance: number;
          decimals: number;
        }[];
      }[] = [];

      for (const [name, service] of Object.entries(this.protocolIndex.getProtocolIndex())) {
        try {
          const wallet = await this.walletService.findOneByUserIdAndIndex(userId, name as IndexEnum);

          const balance = await service.getBalance(wallet.address);

          const tokensFound = await this.tokenService.findByNetwork(wallet.network.id);

          const balanceTokens: {
            token: string;
            symbol: string;
            index: IndexTokenEnum;
            balance: number;
            decimals: number;
          }[] = [];

          for (const token of tokensFound) {
            const tokenBalance = await service.getBalanceToken(wallet.address, token.contract, token.decimals);

            const item = {
              token: token?.tokenData?.name,
              symbol: token?.tokenData?.symbol,
              index: token?.tokenData.index,
              balance: tokenBalance,
              decimals: token?.decimals,
            };

            balanceTokens.push(item);
          }

          balances.push({
            network: wallet.network.name,
            index: wallet.network.index,
            symbol: wallet.network.symbol,
            balance,
            decimals: wallet.network.decimals,
            tokens: balanceTokens,
          });
        } catch (error) {
          console.error(`Failed to retrieve balance for ${name}:`, error);
          throw new InternalServerErrorException(`Failed to retrieve balance for ${name}`);
        }
      }

      return balances;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transfer(transferDto: TransferDto): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    hash: string;
  }> {
    try {
      const wallet = await this.walletService.findOneByUserIdAndIndex(transferDto.userId, transferDto.network);

      const service = this.protocolIndex.getProtocolService(transferDto.network);

      const txHash = await service.transfer(
        wallet.address,
        transferDto.pkEncrypt,
        transferDto.toAddress,
        transferDto.amount,
      );

      return { network: wallet.network.name, index: wallet.network.index, hash: txHash };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transferToken(transferDto: TransferTokenDto) {
    try {
      const wallet = await this.walletService.findOneByUserIdAndIndex(transferDto.userId, transferDto.network);

      const service = this.protocolIndex.getProtocolService(transferDto.network);

      const tokenFound = await this.tokenService.findOneByNetworkAndTokenIndex(transferDto.network, transferDto.token);

      const txHash = await service.transferToken(
        wallet.address,
        transferDto.pkEncrypt,
        transferDto.toAddress,
        transferDto.amount,
        tokenFound.contract,
        tokenFound.decimals,
      );

      return {
        network: wallet.network.name,
        networkIndex: wallet.network.index,
        token: tokenFound.tokenData.name,
        tokenIndex: tokenFound.tokenData.index,
        hash: txHash,
      };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
