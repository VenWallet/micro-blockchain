import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDate } from 'class-validator';
import { StatusEnum } from '../enums/status.enum';
import { MovementTypeEnum } from '../enums/movementType.enum';

export class MovementSchema {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: MovementTypeEnum })
  @IsEnum(MovementTypeEnum)
  @IsNotEmpty()
  movementType: MovementTypeEnum;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  movementDate: Date;

  @ApiProperty({ enum: StatusEnum, default: StatusEnum.PENDING })
  @IsEnum(StatusEnum)
  @IsNotEmpty()
  status: StatusEnum;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transactionHash?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fromAccount?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  toAccount?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fromNetwork?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  toNetwork?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  errorDetails?: string;
}

export class MovementDto extends MovementSchema {}

export class UpdateMovementDto extends PartialType(MovementSchema) {}
