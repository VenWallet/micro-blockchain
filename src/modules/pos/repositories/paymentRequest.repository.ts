import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { PaymentRequestDto, PosLinkDto } from '../dto/pos.dto';
import { PaymentRequestEntity } from '../entities/paymentRequest.entity';

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

      console.log('newEntity: ', newEntity);

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
      relations: ['network', 'token'],
    });
  }

  async findOneByUserId(userId: string): Promise<PaymentRequestEntity | null> {
    return await this.repository.findOne({
      where: { userId },
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