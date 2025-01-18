import { Controller, Get, Post, Body, Patch, Param, Query, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NetworksEnum } from '../network/enums/networks.enum';
import { IndexEnum } from '../network/enums/index.enum';
import { IndexTokenEnum } from '../tokenData/enums/indexToken.enum';
import { SpotMarketService } from './spotMarket.service';
import { CancelLimitOrderDto, CreateSpotMarketDto, PreviewSpotMarketDto } from './dto/spotMarket.dto';

@ApiTags('SpotMarket')
@Controller('spot-market')
export class SpotMarketController {
  constructor(private readonly spotMarketService: SpotMarketService) {}

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
