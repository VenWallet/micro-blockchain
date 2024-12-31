import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { PosSettingsEntity } from '../entities/posSettings.entity';
import { PosSettingsDto } from '../dto/pos.dto';

@Injectable()
export class PosSettingsRepository {
  constructor(
    @InjectRepository(PosSettingsEntity)
    private readonly repository: Repository<PosSettingsEntity>,
  ) {}

  async save(entity: PosSettingsEntity): Promise<PosSettingsEntity> {
    return await this.repository.save(entity);
  }

  async create(posSettingsDto: PosSettingsDto): Promise<PosSettingsEntity> {
    const newEntity = plainToClass(PosSettingsEntity, posSettingsDto);

    return await this.repository.save(newEntity);
  }

  async findAll(): Promise<PosSettingsEntity[]> {
    return await this.repository.find();
  }

  async findOne(id: string): Promise<PosSettingsEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findOneByUserId(userId: string): Promise<PosSettingsEntity | null> {
    return await this.repository.findOne({
      where: { userId },
      relations: ['network', 'token', 'network_ext', 'token_ext', 'token_ext.tokenData', 'token.tokenData'],
    });
  }

  async update(id: string, updateData: Partial<PosSettingsEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('PosSettings not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('PosSettings not found');
    }
  }
}
