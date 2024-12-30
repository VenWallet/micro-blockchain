import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { PosLinkEntity } from '../entities/posLink.entity';
import { PosLinkDto } from '../dto/pos.dto';

@Injectable()
export class PosLinkRepository {
  constructor(
    @InjectRepository(PosLinkEntity)
    private readonly repository: Repository<PosLinkEntity>,
  ) {}

  async save(entity: PosLinkEntity): Promise<PosLinkEntity> {
    return await this.repository.save(entity);
  }

  async create(PosLinkDto: PosLinkDto): Promise<PosLinkEntity> {
    const newEntity = plainToClass(PosLinkEntity, PosLinkDto);

    return await this.repository.save(newEntity);
  }

  async findAll(): Promise<PosLinkEntity[]> {
    return await this.repository.find();
  }

  async findOne(id: string): Promise<PosLinkEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<PosLinkEntity[]> {
    return await this.repository.find({
      where: { userId },
    });
  }

  async findOneByUserId(userId: string): Promise<PosLinkEntity | null> {
    return await this.repository.findOne({
      where: { userId },
    });
  }

  async update(id: string, updateData: Partial<PosLinkEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('PosLink not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('PosLink not found');
    }
  }
}
