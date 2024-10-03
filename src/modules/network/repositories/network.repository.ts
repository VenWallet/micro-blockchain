import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { NetworkEntity } from '../entities/network.entity';
import { NetworkDto } from '../dto/network.dto';

@Injectable()
export class NetworkRepository {
  constructor(
    @InjectRepository(NetworkEntity)
    private readonly repository: Repository<NetworkEntity>,
  ) {}

  async save(entity: NetworkEntity): Promise<NetworkEntity> {
    return await this.repository.save(entity);
  }

  async create(NetworkDto: NetworkDto): Promise<NetworkEntity> {
    const newEntity = this.repository.create(NetworkDto);

    return await this.repository.save(newEntity);

    // return newWallet;
  }

  async findAll(): Promise<NetworkEntity[]> {
    return await this.repository.find();
  }

  async findAllActive(): Promise<NetworkEntity[]> {
    return await this.repository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<NetworkEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<NetworkEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('Network not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Network not found');
    }
  }
}
