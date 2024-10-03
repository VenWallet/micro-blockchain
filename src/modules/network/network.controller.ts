import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NetworkService } from './network.service';
import { NetworkDto, UpdateNetworkDto } from './dto/network.dto';

@ApiTags('Network')
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Post()
  create(@Body() createNetworkDto: NetworkDto) {
    console.log(createNetworkDto);
    return this.networkService.create(createNetworkDto);
  }

  @Get()
  findAll() {
    return this.networkService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.networkService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateNetworkDto: UpdateNetworkDto) {
    return this.networkService.update(id, updateNetworkDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.networkService.remove(id);
  }
}
