import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDate, IsUUID, IsObject, Min } from 'class-validator';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { SpotMarketStatusEnum } from '../enums/spotMarketStatus.enum';
import { OrderTypeEnum } from '../enums/orderType.enum';
import { ExchangeTypeEnum } from '../enums/exchangeType.enum';

export class CreateSpotMarketDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(OrderTypeEnum)
  typeOrder: OrderTypeEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  fromNetwork: IndexEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  toNetwork: IndexEnum;

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
  @IsNotEmpty()
  @Min(0.0000001, { message: 'The amount must be greater than 0' })
  amount: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  price?: number;
}

export class SpotMarketDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(OrderTypeEnum)
  orderType: OrderTypeEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  fromNetwork: IndexEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  toNetwork: IndexEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromCoin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toCoin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(ExchangeTypeEnum)
  exchangeType: ExchangeTypeEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(SpotMarketStatusEnum)
  status: SpotMarketStatusEnum;

  @ApiProperty()
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  side?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  price?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  quantity?: string;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  orderData?: any;
}

export class PreviewSpotMarketDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(OrderTypeEnum)
  typeOrder: OrderTypeEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  fromNetwork: IndexEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  toNetwork: IndexEnum;

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
  @IsNotEmpty()
  @Min(0.0000001, { message: 'The amount must be greater than 0' })
  amount: number;
}
