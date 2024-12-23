import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDate, IsUUID, IsObject, Min } from 'class-validator';
import { IndexEnum } from 'src/modules/network/enums/index.enum';

export class PosSettingsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  network: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  network_ext: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  token_ext: string;
}

export class UpdatePosSettingsDto extends PartialType(PosSettingsDto) {}
