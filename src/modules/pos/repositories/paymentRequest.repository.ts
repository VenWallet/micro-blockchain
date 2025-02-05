import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DeleteResult, LessThan, MoreThanOrEqual, Raw, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { PaymentRequestDto, PosLinkDto } from '../dto/pos.dto';
import { PaymentRequestEntity } from '../entities/paymentRequest.entity';
import { PaymentStatusEnum } from '../enums/paymentStatus.enum';

@Injectable()
export class PaymentRequestRepository {
  constructor(
    @InjectRepository(PaymentRequestEntity)
    private readonly repository: Repository<PaymentRequestEntity>,
  ) {}

  async save(entity: PaymentRequestEntity): Promise<PaymentRequestEntity> {
    return await this.repository.save(entity);
  }

  async create(paymentRequestDto: PaymentRequestDto): Promise<PaymentRequestEntity> {
    try {
      const newEntity = plainToClass(PaymentRequestEntity, paymentRequestDto);

      return await this.repository.save(newEntity);
    } catch (error) {
      console.log('error: ', error);
      throw new Error(error);
    }
  }

  async findAll(): Promise<PaymentRequestEntity[]> {
    return await this.repository.find();
  }

  async findOne(id: string): Promise<PaymentRequestEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['network', 'token', 'token.tokenData'],
    });
  }

  async findProcessingPaid(): Promise<PaymentRequestEntity[]> {
    return await this.repository.find({
      where: { status: PaymentStatusEnum.PROCESSING, isPaid: true },
      relations: ['network', 'token', 'token.tokenData'],
    });
  }

  // async findPendingsAgoOneDay(): Promise<PaymentRequestEntity[]> {
  //   const daysAgo = new Date();
  //   daysAgo.setDate(daysAgo.getDate() - 1);

  //   return await this.repository.find({
  //     where: { status: PaymentStatusEnum.PENDING, createdAt: Between(daysAgo, new Date()) },
  //     relations: ['network', 'token', 'token.tokenData'],
  //   });
  // }

  async findPendingsAgoThirtyMinutes(): Promise<PaymentRequestEntity[]> {
    const now = new Date();
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(now.getMinutes() - 30);

    return await this.repository.find({
      where: {
        status: PaymentStatusEnum.PENDING,
        createdAt: Raw((alias) => `${alias} BETWEEN :thirtyMinutesAgo AND :now`, {
          thirtyMinutesAgo: thirtyMinutesAgo.toISOString(),
          now: now.toISOString(),
        }),
      },
      relations: ['network', 'token', 'token.tokenData'],
    });
  }

  async findPendings(): Promise<PaymentRequestEntity[]> {
    return await this.repository.find({
      where: {
        status: PaymentStatusEnum.PENDING,
      },
      relations: ['network', 'token', 'token.tokenData'],
    });
  }

  async findOneByUserId(userId: string): Promise<PaymentRequestEntity | null> {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    return await this.repository.findOne({
      where: { userId, createdAt: Between(thirtyMinutesAgo, new Date()) },
    });
  }

  async findByUserId(userId: string): Promise<PaymentRequestEntity[]> {
    return await this.repository.find({
      where: { userId },
    });
  }

  async findOneByRefId(refId: string): Promise<PaymentRequestEntity | null> {
    return await this.repository.findOne({
      where: { refId },
    });
  }

  async update(id: string, updateData: Partial<PaymentRequestEntity>): Promise<void> {
    const updateResult = await this.repository.update({ id }, updateData);
    if (updateResult.affected === 0) {
      throw new NotFoundException('PaymentRequest not found');
    }
  }

  async remove(id: string): Promise<void> {
    const deleteResult = await this.repository.delete({ id });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('PaymentRequest not found');
    }
  }
}
