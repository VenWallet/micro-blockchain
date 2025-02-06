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
import { PosLinkRepository } from '../repositories/posLink.repository';
import { PosLinkEntity } from '../entities/posLink.entity';
import { ConnectPosLinkDto, PosLinkDto, UpdatePosLinkDto } from '../dto/pos.dto';
import { WebSocketGatewayService } from 'src/websocket/websocket-gateway.service';

@Injectable()
export class PosLinkService {
  constructor(
    private readonly posLinkRepository: PosLinkRepository,
    private readonly socketService: WebSocketGatewayService,
  ) {}

  async createPosLink(posLinkDto: PosLinkDto) {
    try {
      const posLink = await this.posLinkRepository.create(posLinkDto);

      return posLink;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async connectPosLink(connectPosLinkDto: ConnectPosLinkDto) {
    try {
      const posLinkFound = await this.posLinkRepository.findOne(connectPosLinkDto.posLinkId);

      if (!posLinkFound) {
        throw new NotFoundException('PosLink not found');
      }

      if (posLinkFound.userLinked) {
        if (posLinkFound.userLinked === connectPosLinkDto.userId) {
          await this.socketService.emitEvent(posLinkFound.socketId, 'pos-link:connected', posLinkFound);

          return posLinkFound;
        }
        throw new ConflictException('PosLink already connected');
      }

      if (!posLinkFound.socketId) {
        throw new InternalServerErrorException('PosLink socketId not found');
      }

      const posByUserLinked = await this.posLinkRepository.findOneByUserLinked(connectPosLinkDto.userId);

      if (posByUserLinked) {
        throw new ConflictException('User already connected to another PosLink');
      }

      posLinkFound.userLinked = connectPosLinkDto.userId;

      const posLinkUpdated = await this.posLinkRepository.save(posLinkFound);

      await this.socketService.emitEvent(posLinkUpdated.socketId, 'pos-link:connected', posLinkUpdated);

      return posLinkUpdated;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findByUserId(userId: string): Promise<PosLinkEntity[]> {
    try {
      return await this.posLinkRepository.findByUserId(userId);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOne(id: string): Promise<PosLinkEntity | null> {
    try {
      return await this.posLinkRepository.findOne(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getPosLinkByUserLinked(userId: string): Promise<PosLinkEntity | null> {
    try {
      return await this.posLinkRepository.getPosLinkByUserLinked(userId);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async findOneByUserId(userId: string): Promise<PosLinkEntity | null> {
    try {
      return await this.posLinkRepository.findOneByUserId(userId);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async update(id: string, updatePosLinkDto: UpdatePosLinkDto): Promise<PosLinkEntity> {
    try {
      const posLinkFound = await this.posLinkRepository.findOne(id);

      if (!posLinkFound) {
        throw new NotFoundException('PosLink not found');
      }

      const updatedData = Object.assign(posLinkFound, { ...updatePosLinkDto });

      const posLinkUpdated = await this.posLinkRepository.save(updatedData);

      return posLinkUpdated;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      return await this.posLinkRepository.remove(id);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
