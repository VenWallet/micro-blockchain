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

const configService = new ConfigService<EnvironmentVariables>();

@WebSocketGateway(Number(process.env.PORT_WS!), {
  namespace: 'pos-link',
  cors: { origin: '*' },
})
@Injectable()
export class PosLinkSocket implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly posLinkRepository: PosLinkRepository) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado PosLink: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('pos-link:connect')
  async handlePosLinkConnect(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    try {
      const bodyData = JSON.parse(body);

      if (!bodyData?.paymentRequestId) {
        client.emit('pos-link:error', {
          status: 'error',
          message: 'No se envió el ID de la solicitud de pago.',
        });
        return;
      }

      const posLink = await this.posLinkRepository.findOne(bodyData.posLinkId);

      if (!posLink) {
        client.emit('pos-link:error', {
          status: 'error',
          message: 'No se encontró la solicitud.',
        });
        return;
      }

      await this.posLinkRepository.update(posLink.id, { socketId: client.id });

      client.emit('pos-link:connected', {
        status: 'success',
        paymentRequest: posLink,
      });
    } catch (error) {
      console.error('Error handlePaymentRequestPay:', error);
      client.emit('pos-link:error', {
        status: 'error',
        message: 'No se pudo crear la solicitud de pago.',
      });
    }
  }

  notifyUser(socketId: string, event: string, data: any) {
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    } else {
      console.error(`No se encontró socket para el usuario con ID: ${socketId}`);
    }
  }
}
