import {
  ConflictException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CoreServiceExternal } from 'src/external/core-service.external';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { PosSettingsDto, UpdatePosSettingsDto } from '../dto/pos.dto';
import { PosSettingsRepository } from '../repositories/posSettings.repository';
import { PosSettingsEntity } from '../entities/posSettings.entity';

@Injectable()
export class PosSettingsService {
  constructor(private readonly posSettingsRepository: PosSettingsRepository) {}

  async createPosSettings(createPosSettingsDto: PosSettingsDto) {
    try {
      const posSettings = await this.posSettingsRepository.create(createPosSettingsDto);

      return posSettings;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneByUserId(userId: string): Promise<PosSettingsEntity | null> {
    try {
      return await this.posSettingsRepository.findOneByUserId(userId);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async update(userId: string, updatePosSettingsDto: UpdatePosSettingsDto): Promise<PosSettingsEntity> {
    try {
      const posSettingFound = await this.posSettingsRepository.findOneByUserId(userId);

      if (!posSettingFound) {
        throw new NotFoundException('PosSettings not found');
      }

      const updatedData = Object.assign(posSettingFound, { ...updatePosSettingsDto });

      const posSettingsUpdated = await this.posSettingsRepository.save(updatedData);

      return posSettingsUpdated;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.posSettingsRepository.remove(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
