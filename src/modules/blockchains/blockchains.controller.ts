import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BlockchainsService } from './blockchains.service';
import { NetworksEnum } from '../network/enums/networks.enum';

class IsAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(NetworksEnum)
  network: NetworksEnum;
}

@ApiTags('Blockchains')
@Controller('blockchains')
export class BlockchainsController {
  constructor(private readonly blockchainsService: BlockchainsService) {}

  @Post('is-address')
  isAddress(@Body() isAddressDto: IsAddressDto) {
    return this.blockchainsService.isAddress(isAddressDto.address, isAddressDto.network);
  }
}
