import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WalletDto, UpdateWalletDto, GetMnemonicDto } from './dto/wallet.dto';
import { get } from 'http';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  create(@Body() createWalletDto: WalletDto) {
    console.log(createWalletDto);
    return this.walletService.create(createWalletDto);
  }

  @Get()
  findAll() {
    return this.walletService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(id, updateWalletDto);
  }

  @Post('get-user-id-by-mnemonic')
  getUserIdByMnemonic(@Body() getMnemonicDto: GetMnemonicDto) {
    return this.walletService.getUserIdByMnemonic(getMnemonicDto.mnemonic);
  }

  // @Post('create-wallets')
  // createWallets(@Body() createWalletsDto: CreateWalletsDto) {
  //   console.log(createWalletsDto);
  //   return this.walletService.createWallets(createWalletsDto);
  // }
}
