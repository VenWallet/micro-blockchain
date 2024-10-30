import { Controller, Get, Post, Body, Patch, Param, Query, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NetworksEnum } from '../network/enums/networks.enum';
import { BlockchainService } from './blockchain.service';
import { CreateWalletsDto, ImportWalletsDto, IsAddressDto, TransferDto, TransferTokenDto } from './blockchain.dto';
import { IndexEnum } from '../network/enums/index.enum';
import { IndexTokenEnum } from '../tokenData/enums/indexToken.enum';
import { BooleanValidationPipe } from 'src/helpers/pipes/boolean-validate.pipe';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('create-wallets')
  createWallets(@Body() createWalletsDto: CreateWalletsDto) {
    return this.blockchainService.createWallets(createWalletsDto);
  }

  @Post('import-wallets')
  @HttpCode(HttpStatus.OK)
  importWallets(@Body() importWalletsDto: ImportWalletsDto) {
    return this.blockchainService.importWallets(importWalletsDto);
  }

  @Post('is-address')
  @HttpCode(HttpStatus.OK)
  isAddress(@Body() isAddressDto: IsAddressDto) {
    return this.blockchainService.isAddress(isAddressDto);
  }

  @Get('balance/:userId')
  getBalance(@Param('userId') userId: string, @Query('network') network: IndexEnum) {
    return this.blockchainService.getBalance(userId, network);
  }

  @Get('balance-token/:userId')
  getBalanceToken(@Param('userId') userId: string, @Query('token') token: string) {
    return this.blockchainService.getBalanceToken(userId, token);
  }

  @Get('balances/:userId')
  @ApiQuery({ name: 'hasBalance', type: Boolean, required: false, description: 'Filter by balance status' })
  getBalances(
    @Param('userId') userId: string,
    @Query('hasBalance', new BooleanValidationPipe()) hasBalance: string | boolean,
  ) {
    return this.blockchainService.getBalances(userId, hasBalance as boolean);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  transfer(@Body() transferDto: TransferDto) {
    return this.blockchainService.transfer(transferDto);
  }

  @Post('transfer-token')
  @HttpCode(HttpStatus.OK)
  transferToken(@Body() transferTokenDto: TransferTokenDto) {
    return this.blockchainService.transferToken(transferTokenDto);
  }
}
