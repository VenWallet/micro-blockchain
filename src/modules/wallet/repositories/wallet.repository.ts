import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { WalletEntity } from '../entities/wallet.entity';
import { WalletDto } from '../dto/wallet.dto';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repository: Repository<WalletEntity>,
  ) {}

  async save(entity: WalletEntity): Promise<WalletEntity> {
    return await this.repository.save(entity);
  }

  async create(walletDto: WalletDto): Promise<WalletEntity> {
    const newWallet = plainToClass(WalletEntity, walletDto);

    // const newWallet = this.repository.create(walletDto);

    return await this.repository.save(newWallet);
  }

  async findAll(): Promise<WalletEntity[]> {
    return await this.repository.find();
  }

  async findOne(id: string): Promise<WalletEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<WalletEntity[]> {
    return await this.repository.find({
      where: { userId },
    });
  }

  async update(id: string, updateData: Partial<WalletEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('Wallet not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Wallet not found');
    }
  }
}
