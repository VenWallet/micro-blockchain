import { Controller, Get, Post, Body, Patch, Param, Query, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PosSettingsService } from '../services/posSettings.service';
import {
  PaymentRequestDto,
  PaymentRequestPayDto,
  PosLinkDto,
  PosSettingsDto,
  UpdatePosLinkDto,
  UpdatePosSettingsDto,
} from '../dto/pos.dto';
import { PosLinkService } from '../services/posLink.service';
import { PaymentRequestService } from '../services/paymentRequest.service';

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

  @Patch('link/:userId')
  updatePosLink(@Param('userId') userId: string, @Body() updatePosLinkDto: UpdatePosLinkDto) {
    return this.posLinkService.update(userId, updatePosLinkDto);
  }

  @Get('link/:userId')
  getPosLink(@Param('userId') userId: string) {
    return this.posLinkService.findOneByUserId(userId);
  }

  @Post('payment-request')
  createPaymentRequest(@Body() paymentRequestDto: PaymentRequestDto) {
    return this.paymentRequestService.createPaymentRequest(paymentRequestDto);
  }

  @Post('payment-request/pay')
  paymentRequestPay(@Body() paymentRequestPayDto: PaymentRequestPayDto) {
    return this.paymentRequestService.paymentRequestPay(paymentRequestPayDto);
  }
}
