import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentRequestDto } from '../dto/pos.dto';
import { PaymentRequestRepository } from '../repositories/paymentRequest.repository';
import { PaymentRequestEntity } from '../entities/paymentRequest.entity';
import { ConfigService } from '@nestjs/config';
import { EnvironmentEnum } from 'src/shared/enums/environment.enum';
import { EnvironmentVariables } from 'src/config/env';
import { PosLinkRepository } from '../repositories/posLink.repository';
import * as dotenv from 'dotenv';
dotenv.config();

const configService = new ConfigService<EnvironmentVariables>();

@WebSocketGateway(Number(process.env.PORT_WS!) || 3100, {
  namespace: 'pos',
  cors: { origin: '*' },
})
@Injectable()
export class PosSocket implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly posLinkRepository: PosLinkRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('payment-request:pay')
  async handlePaymentRequestPay(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    try {
      const bodyData = JSON.parse(body);

      if (!bodyData?.paymentRequestId) {
        client.emit('payment-request:error', {
          status: 'error',
          message: 'No se envió el ID de la solicitud de pago.',
        });
        return;
      }

      const paymentRequest = await this.paymentRequestRepository.findOne(bodyData.paymentRequestId);

      if (!paymentRequest) {
        client.emit('payment-request:error', {
          status: 'error',
          message: 'No se encontró la solicitud de pago.',
        });
        return;
      }

      await this.paymentRequestRepository.update(paymentRequest.id, { socketId: client.id });

      client.emit('payment-request:pay-status', paymentRequest);
    } catch (error) {
      console.error('Error handlePaymentRequestPay:', error);
      client.emit('payment-request:error', {
        status: 'error',
        message: 'No se pudo crear la solicitud de pago.',
      });
    }
  }

  @SubscribeMessage('pos-link:connect')
  async handlePosLinkConnect(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    try {
      const bodyData = JSON.parse(body);

      if (!bodyData?.posLinkId) {
        client.emit('pos-link:error', {
          status: 'error',
          message: 'No se envió el ID del PosLink.',
        });
        return;
      }

      const posLink = await this.posLinkRepository.findOne(bodyData.posLinkId);

      if (!posLink) {
        client.emit('pos-link:error', {
          status: 'error',
          message: 'No se encontró el PosLink.',
        });
        return;
      }

      await this.posLinkRepository.update(posLink.id, { socketId: client.id });

      client.emit('pos-link:connected', posLink);
    } catch (error) {
      console.error('Error handlePaymentRequestPay:', error);
      client.emit('pos-link:error', {
        status: 'error',
        message: 'Error in handlePosLinkConnect.' + error?.message || error,
      });
    }
  }

  emitEvent(socketId: string, event: string, data: any) {
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    } else {
      console.error(`No se encontró socket para el usuario con ID: ${socketId}`);
    }
  }
}
