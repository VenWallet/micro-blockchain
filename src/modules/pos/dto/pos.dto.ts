import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDate, IsUUID, IsObject, Min } from 'class-validator';
import { IndexEnum } from 'src/modules/network/enums/index.enum';

export class PosSettingsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(IndexEnum)
  network_ext: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token_ext: string;
}

export class UpdatePosSettingsDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  network: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token: string;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  network_ext: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token_ext: string;
}

export class CreatePosLinkDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;
}

export class PosLinkDto extends CreatePosLinkDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  image: string;
}

export class UpdatePosLinkDto extends PartialType(PosLinkDto) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  userLinked: string;
}

export class ConnectPosLinkDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  posLinkId: string;
}

export class PaymentRequestDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  note: string;
}

export class PaymentRequestPayDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;
}

export class GetAmountMinMaxDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(IndexEnum)
  network: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token?: string;
}
