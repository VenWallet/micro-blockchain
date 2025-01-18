import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { SpotMarketEntity } from '../entities/spotMarket.entity';
import { SpotMarketDto } from '../dto/spotMarket.dto';
import { SpotMarketStatusEnum } from '../enums/spotMarketStatus.enum';
import { OrderTypeEnum } from '../enums/orderType.enum';

@Injectable()
export class SpotMarketRepository {
  constructor(
    @InjectRepository(SpotMarketEntity)
    private readonly repository: Repository<SpotMarketEntity>,
  ) {}

  async save(entity: SpotMarketEntity): Promise<SpotMarketEntity> {
    return await this.repository.save(entity);
  }

  async create(spotMarketDto: SpotMarketDto): Promise<SpotMarketEntity> {
    const newEntity = this.repository.create(spotMarketDto);

    return await this.repository.save(newEntity);
  }

  async findAll(): Promise<SpotMarketEntity[]> {
    return await this.repository.find();
  }

  async findPendings(): Promise<SpotMarketEntity[]> {
    return await this.repository.find({ where: { status: SpotMarketStatusEnum.PENDING } });
  }

  async findScheduled(): Promise<SpotMarketEntity[]> {
    return await this.repository.find({ where: { status: SpotMarketStatusEnum.SCHEDULED } });
  }

  async findOne(id: string): Promise<SpotMarketEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<SpotMarketEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);

    if (updateResult.affected === 0) {
      throw new NotFoundException('SpotMarket not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('SpotMarket not found');
    }
  }

  async getUserSpotMarkets(filters: {
    userId: string;
    status?: SpotMarketStatusEnum;
    fromNetwork?: string;
    toNetwork?: string;
    fromCoin?: string;
    toCoin?: string;
    orderType?: OrderTypeEnum;
  }) {
    const query = this.repository.createQueryBuilder('spotMarket').where('spotMarket.userId = :userId', {
      userId: filters.userId,
    });

    if (filters.status) {
      query.andWhere('spotMarket.status = :status', { status: filters.status });
    }
    if (filters.fromNetwork) {
      query.andWhere('spotMarket.fromNetwork = :fromNetwork', { fromNetwork: filters.fromNetwork });
    }
    if (filters.toNetwork) {
      query.andWhere('spotMarket.toNetwork = :toNetwork', { toNetwork: filters.toNetwork });
    }
    if (filters.fromCoin) {
      query.andWhere('spotMarket.fromCoin = :fromCoin', { fromCoin: filters.fromCoin });
    }
    if (filters.toCoin) {
      query.andWhere('spotMarket.toCoin = :toCoin', { toCoin: filters.toCoin });
    }
    if (filters.orderType) {
      query.andWhere('spotMarket.orderType = :orderType', { orderType: filters.orderType });
    }

    return await query.getMany();
  }
}
