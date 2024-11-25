import { Controller, Get, InternalServerErrorException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import axios from 'axios';
const crypto = require('crypto');

@ApiTags('Health')
@Controller()
export class AppController {
  constructor() {}

  @Get('health2')
  checkHealth(): { status: string } {
    return { status: 'OK' };
  }

  @Get('health')
  async testApi() {
    try {
      const asset = 'USDT';
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret are required');
      }

      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/sapi/v1/capital/config/getall?${queryString}&signature=${signature}`;

      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      const response = await axios.get(url, { headers });
      console.log(response.data);

      const filteredAsset = response.data.find((coin) => coin.coin === asset);

      if (!filteredAsset) {
        console.log(`Asset ${asset} not found.`);
        return null;
      }

      return { data: filteredAsset };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message || error || 'Internal Server Error');
    }
  }
}
