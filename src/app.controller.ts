import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import crypto from 'crypto';
import axios from 'axios';

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
      const apiKey = process.env.BINANCE_API_KEY;
      const apiSecret = process.env.BINANCE_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('API Key and Secret not found');
      }

      let asset;
      let startTime;
      let endTime;
      let status;

      const timestamp = Date.now();
      let queryString = `timestamp=${timestamp}`;

      if (asset) queryString += `&asset=${asset}`;
      if (startTime) queryString += `&startTime=${startTime}`;
      if (endTime) queryString += `&endTime=${endTime}`;
      if (status !== undefined) queryString += `&status=${status}`;

      // Generate signature
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

      const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`;

      console.log(url);

      // Set headers with API Key
      const headers = {
        'X-MBX-APIKEY': apiKey,
      };

      // Send GET request to check deposit history
      const response = await axios.get(url, { headers });

      return { data: response };
    } catch (error) {
      console.log(error);
      return { error: error };
    }
  }
}
