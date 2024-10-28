import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TokensEnum } from '../enums/tokens.enum';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { IndexTokenEnum } from '../enums/indexToken.enum';

export class TokenDataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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

export class UpdateTokenDataDto extends PartialType(TokenDataDto) {}
