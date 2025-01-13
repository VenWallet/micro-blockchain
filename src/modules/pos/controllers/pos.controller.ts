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

  @Get('link/:userId')
  getPosLinkByUserId(@Param('userId') userId: string) {
    return this.posLinkService.findByUserId(userId);
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
  getPaymentRequestByUserId(@Param('userId') userId: string) {
    return this.paymentRequestService.getPaymentRequestByUserId(userId);
  }
}
