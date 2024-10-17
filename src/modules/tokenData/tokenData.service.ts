import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { TokenDataRepository } from './repositories/tokenData.repository';
import { TokenDataEntity } from './entities/tokenData.entity';
import { TokenDataDto, UpdateTokenDataDto } from './dto/tokenData.dto';

@Injectable()
export class TokenDataService {
  constructor(private readonly tokenDataRepository: TokenDataRepository) {}

  async create(createTokenDataDto: TokenDataDto): Promise<TokenDataEntity> {
    try {
      return await this.tokenDataRepository.create(createTokenDataDto);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAll(): Promise<TokenDataEntity[]> {
    try {
      return await this.tokenDataRepository.findAll();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAllActive(): Promise<TokenDataEntity[]> {
    try {
      return await this.tokenDataRepository.findAllActive();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOne(id: string): Promise<TokenDataEntity> {
    try {
      const tokenFound = await this.tokenDataRepository.findOne(id);

      if (!tokenFound) {
        throw new NotFoundException('Token not found');
      }

      return tokenFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async update(id: string, updateTokenDataDto: UpdateTokenDataDto): Promise<TokenDataEntity> {
    try {
      await this.tokenDataRepository.update(id, updateTokenDataDto);

      return (await this.tokenDataRepository.findOne(id))!;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.tokenDataRepository.remove(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
