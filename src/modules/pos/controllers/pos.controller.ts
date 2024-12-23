import { Controller, Get, Post, Body, Patch, Param, Query, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NetworksEnum } from '../../network/enums/networks.enum';
import { IndexEnum } from '../../network/enums/index.enum';
import { IndexTokenEnum } from '../../tokenData/enums/indexToken.enum';
import { PosSettingsService } from '../services/posSettings.service';
import { PosSettingsDto, UpdatePosSettingsDto } from '../dto/pos.dto';

@ApiTags('Pos')
@Controller('pos')
export class PosSettingsController {
  constructor(private readonly posSettingsService: PosSettingsService) {}

  @Post('settings')
  previewSpotMarket(@Body() posSettingsDto: PosSettingsDto) {
    return this.posSettingsService.createPosSettings(posSettingsDto);
  }

  @Patch('settings/:userId')
  createSpotMarket(@Body() updatePosSettingsDto: UpdatePosSettingsDto, @Param('userId') userId: string) {
    return this.posSettingsService.update(userId, updatePosSettingsDto);
  }

  @Get('settings/:userId')
  getSpotMarket(@Param('userId') userId: string) {
    return this.posSettingsService.findOne(userId);
  }
}
