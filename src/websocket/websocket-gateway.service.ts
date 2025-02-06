import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import * as socketIo from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PosLinkRepository } from 'src/modules/pos/repositories/posLink.repository';
import { PaymentRequestRepository } from 'src/modules/pos/repositories/paymentRequest.repository';
import * as dotenv from 'dotenv';
dotenv.config();

@WebSocketGateway({
  cors: { origin: '*' },
})
@Injectable()
export class WebSocketGatewayService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  sockets: Socket[] = [];

  constructor(
    private readonly posLinkRepository: PosLinkRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);

    this.sockets.push(client);

    client.on('ping', () => {
      console.log(`Ping received from client: ${client.id}`);
      client.emit('pong');
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);

    this.sockets = this.sockets.filter((socket) => socket.id !== client.id);
  }

  @SubscribeMessage('payment-request:pay')
  async handlePaymentRequestPay(@MessageBody() body: any, @ConnectedSocket() client: Socket) {
    try {
      console.log('payment-request:pay');
      console.log(body);
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
        console.log('payment-request:error');
        client.emit('payment-request:error', {
          status: 'error',
          message: 'No se encontró la solicitud de pago.',
        });
        return;
      }

      await this.paymentRequestRepository.update(paymentRequest.id, { socketId: client.id });

      console.log('payment-request:pay-status', paymentRequest.status);

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
      console.log('pos-link:connect');
      console.log(body);
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

      posLink.socketId = client.id;

      posLink.save();

      console.log('emit pos-link:connected', posLink);

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
    console.log(`🔄 Intentando emitir evento ${event} a ${socketId}`);

    if (!this.server) {
      throw new Error('❌ No se ha inicializado el servidor de WebSockets.');
    }

    console.log('this.sockets', this.sockets);

    const socket = this.sockets.find((socket) => socket.id === socketId);

    console.log('socket', socket);
    if (socket) {
      console.log(`✅ Emitiendo evento ${event} a ${socketId}`, data);
      const hola = socket.emit(event, data);

      console.log('hola', hola);
    } else {
      console.log(`⚠️ No se encontró un socket activo para el usuario con ID: ${socketId}`);
    }
  }
}
