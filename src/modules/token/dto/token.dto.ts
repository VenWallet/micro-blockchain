import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';

export class TokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contract: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  decimals: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenData: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  network: string;
}

export class UpdateTokenDto extends PartialType(TokenDto) {}
