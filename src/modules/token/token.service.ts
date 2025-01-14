import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { TokenRepository } from './repositories/token.repository';
import { TokenEntity } from './entities/token.entity';
import { TokenDto, UpdateTokenDto } from './dto/token.dto';
import { instanceToPlain } from 'class-transformer';
import { IndexEnum } from '../network/enums/index.enum';
import { IndexTokenEnum } from '../tokenData/enums/indexToken.enum';
import { net } from 'web3';

@Injectable()
export class TokenService {
  constructor(private readonly tokenRepository: TokenRepository) {}

  async create(createTokenDto: TokenDto): Promise<TokenEntity> {
    try {
      return await this.tokenRepository.create(createTokenDto);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAll(): Promise<TokenEntity[]> {
    try {
      return await this.tokenRepository.findAll();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findByNetwork(network: string): Promise<TokenEntity[]> {
    try {
      return await this.tokenRepository.findByNetwork(network);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneWithRelations(id: string): Promise<TokenEntity> {
    try {
      const tokenFound = await this.tokenRepository.findOneWithRelations(id);

      if (!tokenFound) {
        throw new NotFoundException('Token not found');
      }

      return tokenFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneBySymbolNetworkId(symbol: string, networkId: string): Promise<TokenEntity | null> {
    try {
      const tokenFound = await this.tokenRepository.findOneBySymbolNetworkId(symbol, networkId);

      return tokenFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOne(id: string): Promise<TokenEntity> {
    try {
      const tokenFound = await this.tokenRepository.findOne(id);

      if (!tokenFound) {
        throw new NotFoundException('Token not found');
      }

      return tokenFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  // async findOneByNetworkAndToken(network: IndexEnum, token: string): Promise<TokenEntity> {
  //   try {
  //     const tokenFound = await this.tokenRepository.findOneByNetworkAndTokenIndex(network, token);

  //     if (!tokenFound) {
  //       throw new NotFoundException('Token not found');
  //     }

  //     return tokenFound;
  //   } catch (error) {
  //     throw new ExceptionHandler(error);
  //   }
  // }

  async update(id: string, updateTokenDto: UpdateTokenDto): Promise<TokenEntity> {
    try {
      const tokenFound = await this.tokenRepository.findOne(id);

      if (!tokenFound) {
        throw new NotFoundException('Token not found');
      }

      const updatedData = Object.assign(tokenFound, { ...updateTokenDto });

      const clientUpdated = await this.tokenRepository.save(updatedData);

      return instanceToPlain(clientUpdated) as TokenEntity;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.tokenRepository.remove(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
