import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { TokenEntity } from '../entities/token.entity';
import { TokenDto } from '../dto/token.dto';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { IndexTokenEnum } from 'src/modules/tokenData/enums/indexToken.enum';

@Injectable()
export class TokenRepository {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly repository: Repository<TokenEntity>,
  ) {}

  async save(entity: TokenEntity): Promise<TokenEntity> {
    return await this.repository.save(entity);
  }

  async create(tokenDto: TokenDto): Promise<TokenEntity> {
    // const newEntity = this.repository.create(tokenDto);
    const newEntity = plainToClass(TokenEntity, tokenDto);

    return await this.repository.save(newEntity);
  }

  async findAll(): Promise<TokenEntity[]> {
    return await this.repository.find();
  }

  async findByNetwork(network: string): Promise<TokenEntity[]> {
    return await this.repository.find({ where: { network: { id: network } }, relations: ['tokenData', 'network'] });
  }

  async findOneWithRelations(id: string): Promise<TokenEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['tokenData', 'network'],
    });
  }

  async findOneBySymbolNetworkId(symbol: string, networkId: string): Promise<TokenEntity | null> {
    return await this.repository.findOne({
      where: { tokenData: { symbol }, network: { id: networkId } },
      relations: ['tokenData'],
    });
  }

  async findOne(id: string): Promise<TokenEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<TokenEntity>): Promise<void> {
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
