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
  namespace: '/socket',
  cors: { origin: '*' },
})
@Injectable()
export class WebSocketGatewayService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly posLinkRepository: PosLinkRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);

    client.on('ping', () => {
      console.log(`Ping received from client: ${client.id}`);
      client.emit('pong');
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
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

    // Verificar que el servidor WebSocket esté inicializado
    if (!this.server) {
      console.error('❌ Error: Servidor de WebSockets no inicializado.');
      return;
    }

    console.log('server', this.server);
    console.log('🔍 Estado del servidor:', this.server.sockets.sockets.size, 'sockets conectados.');

    // Verificar si el socketId es válido
    const socket = this.server.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit(event, data);
      console.log(`✅ Evento ${event} emitido correctamente a ${socketId}`);
    } else {
      console.warn(`⚠️ Advertencia: No se encontró un socket activo con ID ${socketId}`);
    }
  }
}
