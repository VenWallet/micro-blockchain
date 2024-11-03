import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
  Request,
  InternalServerErrorException,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { AuthGuard } from 'src/helpers/guards/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpCustomService } from 'src/shared/http/http.service';
import { HttpClient } from 'src/shared/http/http.client';
import { MovementDto } from './dto/core.dto';

@Injectable()
export class CoreService {
  private readonly httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient('http://micro-core:3000/api/');
  }

  async createMovement(movementDto: MovementDto): Promise<void> {
    try {
      const { data } = await this.httpClient.request({
        method: 'POST',
        path: `movement`,
        body: movementDto,
      });

      return data;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
