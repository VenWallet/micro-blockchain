import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { NetworksEnum } from '../network/enums/networks.enum';
import { IndexEnum } from '../network/enums/index.enum';
import { Type } from 'class-transformer';

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

export class ImportWalletsFromMnemonicDto {
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
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: IndexEnum;
}

export class PriceRouteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenIn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenOut: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amountIn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  minAmountOut: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  txMain: any[];

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  networkId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toToken: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class SwapDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mnemonic: string;

  @ApiProperty({ type: PriceRouteDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PriceRouteDto)
  priceRoute: PriceRouteDto;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: IndexEnum;
}
