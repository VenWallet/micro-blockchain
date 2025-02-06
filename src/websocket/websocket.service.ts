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

@Injectable()
export class WebsocketService {
  server: Server;

  constructor(
    private readonly posLinkRepository: PosLinkRepository,
    private readonly paymentRequestRepository: PaymentRequestRepository,
  ) {}

  setup(server: Server) {
    this.server = server;

    server.on('connection', (socket) => {
      console.log(`🔗 New WebSocket connection: ${socket.id}`);

      socket.on('payment-request:pay', (data) => {
        this.handlePaymentRequestPay(data, socket);
      });

      socket.on('pos-link:connect', (data) => {
        this.handlePosLinkConnect(data, socket);
      });

      socket.on('disconnect', () => {
        console.log(`❌ WebSocket disconnected: ${socket.id}`);
      });
    });
  }

  // @SubscribeMessage('payment-request:pay')
  async handlePaymentRequestPay(body: any, socket: Socket) {
    try {
      console.log('payment-request:pay');
      console.log(body);
      const bodyData = JSON.parse(body);

      if (!bodyData?.paymentRequestId) {
        socket.emit('payment-request:error', {
          status: 'error',
          message: 'No se envió el ID de la solicitud de pago.',
        });
        return;
      }

      const paymentRequest = await this.paymentRequestRepository.findOne(bodyData.paymentRequestId);

      if (!paymentRequest) {
        console.log('payment-request:error');
        socket.emit('payment-request:error', {
          status: 'error',
          message: 'No se encontró la solicitud de pago.',
        });
        return;
      }

      await this.paymentRequestRepository.update(paymentRequest.id, { socketId: socket.id });

      console.log('payment-request:pay-status', paymentRequest.status);

      socket.emit('payment-request:pay-status', paymentRequest);
    } catch (error) {
      console.error('Error handlePaymentRequestPay:', error);
      socket.emit('payment-request:error', {
        status: 'error',
        message: 'No se pudo crear la solicitud de pago.',
      });
    }
  }

  // @SubscribeMessage('pos-link:connect')
  async handlePosLinkConnect(body: any, socket: Socket) {
    try {
      console.log('pos-link:connect');
      console.log(body);
      const bodyData = JSON.parse(body);

      if (!bodyData?.posLinkId) {
        socket.emit('pos-link:error', {
          status: 'error',
          message: 'No se envió el ID del PosLink.',
        });
        return;
      }

      const posLink = await this.posLinkRepository.findOne(bodyData.posLinkId);

      if (!posLink) {
        socket.emit('pos-link:error', {
          status: 'error',
          message: 'No se encontró el PosLink.',
        });
        return;
      }

      posLink.socketId = socket.id;

      posLink.save();

      console.log('emit pos-link:connected', posLink);

      socket.emit('pos-link:connected', posLink);
    } catch (error) {
      console.error('Error handlePaymentRequestPay:', error);
      socket.emit('pos-link:error', {
        status: 'error',
        message: 'Error in handlePosLinkConnect.' + error?.message || error,
      });
    }
  }

  emitEvent(socketId: string, event: string, data: any) {
    console.log(`🔄 Intentando emitir evento ${event} a ${socketId}`);

    if (!this.server) {
      console.error('❌ Error: Servidor de WebSockets no inicializado.');
      return;
    }

    const socket = this.server.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit(event, data);
      console.log(`✅ Evento ${event} emitido correctamente a ${socketId}`);
    } else {
      console.warn(`⚠️ Advertencia: No se encontró un socket activo con ID ${socketId}`);
    }
  }
}
