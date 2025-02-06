import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config/env';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import { WebsocketService } from './websocket/websocket.service';
dotenv.config();

async function bootstrap() {
  const configService = new ConfigService();

  const apiPort = configService.get('PORT');
  const wsPort = configService.get('PORT_WS');

  // Servidor HTTP para la API
  const httpServer = http.createServer();

  // Servidor HTTPS para WebSockets
  const httpsOptions = {
    cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
    key: fs.readFileSync(process.env.SSL_KEY_PATH!),
  };
  const httpsServer = https.createServer(httpsOptions);

  // Crear instancia de NestJS
  const app = await NestFactory.create(AppModule);

  app.use(morgan('dev'));
  app.enableCors();
  app.setGlobalPrefix('/api');

  // Documentación Swagger
  const config = new DocumentBuilder()
    .setTitle('Micro Blockchain API')
    .setDescription('Micro Blockchain API Documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // Validaciones globales
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Inicializar la API en HTTP
  await app.init();
  httpServer.on('request', app.getHttpAdapter().getInstance());
  httpServer.listen(apiPort, () => {
    console.log(`🚀 API HTTP Server running on http://localhost:${apiPort}`);
  });

  // Configurar WebSockets con HTTPS
  const io = new Server(httpsServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const websocketService = app.get(WebsocketService);
  websocketService.setup(io);

  // Iniciar WebSockets en el puerto 3100 con HTTPS
  httpsServer.listen(wsPort, () => {
    console.log(`🔗 WebSocket HTTPS Server running on https://localhost:${wsPort}`);
  });
}

bootstrap();
