import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  Delete,
  Res,
} from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PosSettingsService } from '../services/posSettings.service';
import {
  ConnectPosLinkDto,
  GetAmountMinMaxDto,
  PaymentRequestDto,
  PaymentRequestPayDto,
  PosLinkDto,
  PosSettingsDto,
  UpdatePosLinkDto,
  UpdatePosSettingsDto,
} from '../dto/pos.dto';
import { PosLinkService } from '../services/posLink.service';
import { PaymentRequestService } from '../services/paymentRequest.service';
import { Response } from 'express';

@ApiTags('Pos')
@Controller('pos')
export class PosSettingsController {
  constructor(
    private readonly posSettingsService: PosSettingsService,
    private readonly posLinkService: PosLinkService,
    private readonly paymentRequestService: PaymentRequestService,
  ) {}

  @Post('settings')
  createPosSettings(@Body() posSettingsDto: PosSettingsDto) {
    return this.posSettingsService.createPosSettings(posSettingsDto);
  }

  @Patch('settings/:userId')
  updatePosSettings(@Body() updatePosSettingsDto: UpdatePosSettingsDto, @Param('userId') userId: string) {
    return this.posSettingsService.update(userId, updatePosSettingsDto);
  }

  @Get('settings/:userId')
  getPosSettings(@Param('userId') userId: string) {
    return this.posSettingsService.findOneByUserId(userId);
  }

  @Post('link')
  createPosLink(@Body() posLinkDto: PosLinkDto) {
    return this.posLinkService.createPosLink(posLinkDto);
  }

  @Delete('link/:id')
  deletePosLink(@Param('id') id: string) {
    return this.posLinkService.remove(id);
  }

  @Post('link/connect')
  connectPosLink(@Body() connectPosLinkDto: ConnectPosLinkDto) {
    console.log('connectPosLink');
    return this.posLinkService.connectPosLink(connectPosLinkDto);
  }

  @Patch('link/:id')
  updatePosLink(@Param('id') id: string, @Body() updatePosLinkDto: UpdatePosLinkDto) {
    return this.posLinkService.update(id, updatePosLinkDto);
  }

  @Get('link/linked/:userId')
  getPosLinkByUserLinked(@Param('userId') userId: string) {
    return this.posLinkService.getPosLinkByUserLinked(userId);
  }

  @Get('link-by-user-id/:userId')
  getPosLinkByUserId(@Param('userId') userId: string) {
    return this.posLinkService.findByUserId(userId);
  }

  @Get('link/:id')
  getPosLink(@Param('id') id: string) {
    return this.posLinkService.findOne(id);
  }

  @Post('payment-request')
  createPaymentRequest(@Body() paymentRequestDto: PaymentRequestDto) {
    return this.paymentRequestService.createPaymentRequest(paymentRequestDto);
  }

  @Post('payment-request/pay')
  paymentRequestPay(@Body() paymentRequestPayDto: PaymentRequestPayDto) {
    return this.paymentRequestService.paymentRequestPay(paymentRequestPayDto);
  }

  @Post('payment-request/amount-min-max')
  getAmountMixMax(@Body() getAmountMinMaxDto: GetAmountMinMaxDto) {
    return this.paymentRequestService.getAmountMinMax(getAmountMinMaxDto);
  }

  @Get('payment-request/:userId')
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha de inicio',
    example: '2024-12-01T17:20:48.111Zs o 2024-12-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha de fin',
    example: '2024-12-01T17:20:48.111Zs o 2024-12-01',
  })
  @ApiQuery({ name: 'csv', required: false, type: Boolean, description: 'Exportar a CSV', example: 'true' })
  async getPaymentRequestByUserId(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('csv') csv?: boolean,
  ) {
    const data = await this.paymentRequestService.findByFilters({ userId, startDate, endDate });

    if (csv) {
      if (!data.length) {
        return res.status(HttpStatus.NO_CONTENT).send('No data found');
      }

      return this.paymentRequestService.convertToCsv(data, res);
    }

    res.json(data);
  }
}
