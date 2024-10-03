import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { NetworksEnum } from '../enums/networks.enum';

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
  @IsString()
  @IsOptional()
  image: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}

export class UpdateNetworkDto extends PartialType(NetworkDto) {}
