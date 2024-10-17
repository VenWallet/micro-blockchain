import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { TokenDataEntity } from '../entities/tokenData.entity';
import { TokenDataDto } from '../dto/tokenData.dto';

@Injectable()
export class TokenDataRepository {
  constructor(
    @InjectRepository(TokenDataEntity)
    private readonly repository: Repository<TokenDataEntity>,
  ) {}

  async save(entity: TokenDataEntity): Promise<TokenDataEntity> {
    return await this.repository.save(entity);
  }

  async create(tokenDataDto: TokenDataDto): Promise<TokenDataEntity> {
    const newEntity = this.repository.create(tokenDataDto);

    return await this.repository.save(newEntity);

    // return newWallet;
  }

  async findAll(): Promise<TokenDataEntity[]> {
    return await this.repository.find();
  }

  async findAllActive(): Promise<TokenDataEntity[]> {
    return await this.repository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<TokenDataEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<TokenDataEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('Token not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('Token not found');
    }
  }
}
