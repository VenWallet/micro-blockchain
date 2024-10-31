import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsNumber } from 'class-validator';
import { NetworksEnum } from '../network/enums/networks.enum';
import { IndexEnum } from '../network/enums/index.enum';

export class CreateWalletsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mnemonic: string;
}

export class TransferDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pkEncrypt: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: IndexEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class TransferTokenDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pkEncrypt: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: IndexEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class IsAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: IndexEnum;
}

export class ImportWalletsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mnemonic: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class PreviewSwapDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromCoin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toCoin: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsEnum(IndexEnum)
  networkIndex: IndexEnum;
}
