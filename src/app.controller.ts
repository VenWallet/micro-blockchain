import { Controller, Get, InternalServerErrorException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor() {}

  @Get('health')
  checkHealth(): { status: string } {
    return { status: 'OK' };
  }
}
