import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TokenDataService } from './tokenData.service';
import { TokenDataDto, UpdateTokenDataDto } from './dto/tokenData.dto';

@ApiTags('TokenData')
@Controller('token-data')
export class TokenDataController {
  constructor(private readonly tokenDataService: TokenDataService) {}

  @Post()
  create(@Body() createTokenDataDto: TokenDataDto) {
    console.log(createTokenDataDto);
    return this.tokenDataService.create(createTokenDataDto);
  }

  @Get()
  findAll() {
    return this.tokenDataService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tokenDataService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateTokenDataDto) {
    return this.tokenDataService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tokenDataService.remove(id);
  }
}
