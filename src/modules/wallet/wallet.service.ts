import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/shared/handlers/exception.handler';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';
import { CreateWalletsDto, UpdateWalletDto, WalletDto } from './dto/wallet.dto';
import { NetworkService } from '../network/network.service';
import { BlockchainsService } from 'src/blockchains/blockchains.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly networkService: NetworkService,
    private readonly blockchainsService: BlockchainsService,
  ) {}

  async create(createWalletDto: WalletDto): Promise<WalletEntity> {
    try {
      return await this.walletRepository.create(createWalletDto);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAll(): Promise<WalletEntity[]> {
    try {
      return await this.walletRepository.findAll();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOne(id: string): Promise<WalletEntity> {
    try {
      const associateFound = await this.walletRepository.findOne(id);

      if (!associateFound) {
        throw new NotFoundException('Associate not found');
      }

      return associateFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async update(id: string, updateWalletDto: UpdateWalletDto): Promise<WalletEntity> {
    try {
      const walletFound = await this.walletRepository.findOne(id);

      if (!walletFound) {
        throw new NotFoundException('Wallet not found');
      }

      const dataUpdate = {
        ...updateWalletDto,
        network: updateWalletDto.network
          ? await this.networkService.findOne(updateWalletDto.network)
          : walletFound.network,
      };

      const updatedData = Object.assign(walletFound, dataUpdate);

      return await this.walletRepository.save(updatedData);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async createWallets(createWalletsDto: CreateWalletsDto) {
    try {
      // const mnemonic = CryptShared.decryptRsa(createWalletsDto.mnemonic);
      const mnemonic = createWalletsDto.mnemonic;

      const networks = await this.networkService.findAllActive();

      const wallets = await this.walletRepository.findByUserId(createWalletsDto.userId);

      const credentials = await this.blockchainsService.getCredentialsByMnemonic(mnemonic);

      for (const credential of credentials) {
        const network = networks.find((network) => network.name === credential.name);

        if (!network) {
          throw new HttpException('Network not found', HttpStatus.NOT_FOUND);
        }

        const walletFound = wallets.find((wallet) => wallet.address === credential.address);

        if (!walletFound) {
          await this.walletRepository.create({
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
}
