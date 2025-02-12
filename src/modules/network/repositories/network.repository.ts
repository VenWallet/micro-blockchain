import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { NetworkEntity } from '../entities/network.entity';
import { NetworkDto } from '../dto/network.dto';
import { IndexEnum } from '../enums/index.enum';

@Injectable()
export class NetworkRepository {
  constructor(
    @InjectRepository(NetworkEntity)
    private readonly repository: Repository<NetworkEntity>,
  ) {}

  async save(entity: NetworkEntity): Promise<NetworkEntity> {
    return await this.repository.save(entity);
  }

  async create(networkDto: NetworkDto): Promise<NetworkEntity> {
    const newEntity = this.repository.create(networkDto);

    return await this.repository.save(newEntity);

    // return newWallet;
  }

  async findAll(): Promise<NetworkEntity[]> {
    return await this.repository.find({ relations: ['tokens', 'tokens.tokenData'] });
  }

  async findAllActive(): Promise<NetworkEntity[]> {
    return await this.repository.find({ where: { isActive: true }, relations: ['tokens', 'tokens.tokenData'] });
  }

  async findOne(id: string): Promise<NetworkEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['tokens'],
    });
  }

  async findOneByIndex(index: IndexEnum): Promise<NetworkEntity | null> {
    return await this.repository.findOne({
      where: { index },
      relations: ['tokens'],
    });
  }

  async update(id: string, updateData: Partial<NetworkEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('Red no encontrada');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Red no encontrada');
    }
  }
}
