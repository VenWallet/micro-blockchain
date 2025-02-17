import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  Res,
} from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NetworksEnum } from '../network/enums/networks.enum';
import { IndexEnum } from '../network/enums/index.enum';
import { IndexTokenEnum } from '../tokenData/enums/indexToken.enum';
import { SpotMarketService } from './spotMarket.service';
import { CancelLimitOrderDto, CreateSpotMarketDto, PreviewSpotMarketDto } from './dto/spotMarket.dto';
import { SpotMarketStatusEnum } from './enums/spotMarketStatus.enum';
import { OrderTypeEnum } from './enums/orderType.enum';
import { Response } from 'express';

@ApiTags('SpotMarket')
@Controller('spot-market')
export class SpotMarketController {
  constructor(private readonly spotMarketService: SpotMarketService) {}

  @Get('user-spot-markets')
  @ApiQuery({ name: 'userId', required: true, type: String, description: 'ID del usuario' })
  @ApiQuery({ name: 'status', required: false, enum: SpotMarketStatusEnum, description: 'Estado del mercado spot' })
  @ApiQuery({ name: 'fromNetwork', required: false, type: String, description: 'Red de origen' })
  @ApiQuery({ name: 'toNetwork', required: false, type: String, description: 'Red de destino' })
  @ApiQuery({ name: 'fromCoin', required: false, type: String, description: 'Moneda de origen' })
  @ApiQuery({ name: 'toCoin', required: false, type: String, description: 'Moneda de destino' })
  @ApiQuery({ name: 'orderType', required: false, enum: OrderTypeEnum, description: 'Tipo de orden' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha de inicio',
    example: '2024-12-01T17:20:48.111Zs o 2024-12-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha de fin',
    example: '2024-12-01T17:20:48.111Zs o 2024-12-01',
  })
  @ApiQuery({ name: 'csv', required: false, type: Boolean, description: 'Exportar a CSV', example: 'true' })
  async getUserSpotMarkets(
    @Res() res: Response,
    @Query('userId') userId: string,
    @Query('status') status?: SpotMarketStatusEnum,
    @Query('fromNetwork') fromNetwork?: string,
    @Query('toNetwork') toNetwork?: string,
    @Query('fromCoin') fromCoin?: string,
    @Query('toCoin') toCoin?: string,
    @Query('orderType') orderType?: OrderTypeEnum,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('csv') csv?: boolean,
  ) {
    const data = await this.spotMarketService.getUserSpotMarkets({
      userId,
      status,
      fromNetwork,
      toNetwork,
      fromCoin,
      toCoin,
      orderType,
      startDate,
      endDate,
    });

    if (csv) {
      if (!data.length) {
        return res.status(HttpStatus.NO_CONTENT).send('No data found');
      }

      return this.spotMarketService.convertToCsv(data, res);
    }

    res.json(data);
  }

  @Post('preview-spot-market')
  previewSpotMarket(@Body() previewSpotMarketDto: PreviewSpotMarketDto) {
    return this.spotMarketService.previewSpotMarket(previewSpotMarketDto);
  }

  @Post('create-spot-market')
  createSpotMarket(@Body() createSpotMarketDto: CreateSpotMarketDto) {
    return this.spotMarketService.createSpotMarket(createSpotMarketDto);
  }

  @Post('cancel-limit-order')
  cancelLimitOrder(@Body() cancelLimitOrderDto: CancelLimitOrderDto) {
    return this.spotMarketService.cancelLimitOrder(cancelLimitOrderDto);
  }
}
