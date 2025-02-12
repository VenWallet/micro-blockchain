import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NetworkRepository } from './repositories/network.repository';
import { NetworkEntity } from './entities/network.entity';
import { NetworkDto, UpdateNetworkDto } from './dto/network.dto';
import { IndexEnum } from './enums/index.enum';

@Injectable()
export class NetworkService {
  constructor(private readonly networkRepository: NetworkRepository) {}

  async create(createNetworkDto: NetworkDto): Promise<NetworkEntity> {
    try {
      return await this.networkRepository.create(createNetworkDto);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAll(): Promise<NetworkEntity[]> {
    try {
      return await this.networkRepository.findAll();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findAllActive(): Promise<NetworkEntity[]> {
    try {
      return await this.networkRepository.findAllActive();
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOne(id: string): Promise<NetworkEntity> {
    try {
      const networkFound = await this.networkRepository.findOne(id);

      if (!networkFound) {
        throw new NotFoundException('Red no encontrada');
      }

      return networkFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneByIndex(index: IndexEnum): Promise<NetworkEntity> {
    try {
      const networkFound = await this.networkRepository.findOneByIndex(index);

      if (!networkFound) {
        throw new NotFoundException('Red no encontrada');
      }

      return networkFound;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async update(id: string, updateNetworkDto: UpdateNetworkDto): Promise<NetworkEntity> {
    try {
      await this.networkRepository.update(id, updateNetworkDto);

      return (await this.networkRepository.findOne(id))!;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.networkRepository.remove(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
