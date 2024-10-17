import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { NetworksEnum } from '../enums/networks.enum';
import { IndexEnum } from '../enums/index.enum';

export class NetworkDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(NetworksEnum)
  name: NetworksEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  index: IndexEnum;

  @ApiProperty()
  @IsString()
  @IsOptional()
  image: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  decimals: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}

export class UpdateNetworkDto extends PartialType(NetworkDto) {}
