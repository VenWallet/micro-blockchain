import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config/env';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppWsModule } from './app-ws.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables>);

  const port = configService.get('PORT', { infer: true })!;

  app.use(morgan('dev'));
  app.enableCors();

  app.setGlobalPrefix('/api');

  const config = new DocumentBuilder()
    .setTitle('Micro Blockchain API')
    .setDescription('Micro Blockchain API Documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(port);

  const url = await app.getUrl();

  const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/app.venwallet.xyz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/app.venwallet.xyz/fullchain.pem'),
  };
  const appWs = await NestFactory.create(AppWsModule, {
    httpsOptions,
  });

  const wsPort = configService.get('PORT_WS', { infer: true })!;

  appWs.useWebSocketAdapter(new IoAdapter(appWs));

  appWs.init();

  await appWs.listen(wsPort);

  console.log(`Server is running on ${url}`);
  console.log(`Ws is running on ${wsPort}`);
}

bootstrap();
