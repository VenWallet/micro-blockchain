import { forwardRef, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';
import { UpdateWalletDto, WalletDto } from './dto/wallet.dto';
import { NetworkService } from '../network/network.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IndexEnum } from '../network/enums/index.enum';
import { UtilsShared } from 'src/shared/utils/utils.shared';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly networkService: NetworkService,
  ) {}

  async create(createWalletDto: WalletDto): Promise<WalletEntity> {
    try {
      return await this.walletRepository.create(createWalletDto);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getUserIdByMnemonic(mnemonic: string): Promise<{
    userId: string;
  }> {
    const address = await UtilsShared.getAddressNearFromMnemonic(mnemonic);

    const wallet = await this.walletRepository.findOneByAddress(address);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return { userId: wallet.userId };
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
      const walletFound = await this.walletRepository.findOne(id);

      if (!walletFound) {
        throw new NotFoundException('Wallet not found');
      }

      return walletFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findByUserId(id: string): Promise<WalletEntity[]> {
    try {
      const wallets = await this.walletRepository.findByUserId(id);

      return wallets;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneByUserIdAndIndex(userId: string, index: IndexEnum): Promise<WalletEntity> {
    try {
      const walletFound = await this.walletRepository.findOneByUserIdAndIndex(userId, index);

      if (!walletFound) {
        throw new NotFoundException('Wallet not found');
      }

      return walletFound;
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
}
