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
import * as dotenv from 'dotenv';
dotenv.config();

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

  // const appWs =
  //   configService.get('NODE_ENV') === 'production'
  //     ? await NestFactory.create(AppWsModule, {
  //         cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
  //         key: fs.readFileSync(process.env.SSL_KEY_PATH!),
  //       } as any)
  //     : await NestFactory.create(AppWsModule);

  const appWs = await NestFactory.create(AppWsModule, {
    cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
    key: fs.readFileSync(process.env.SSL_KEY_PATH!),
  } as any);

  const wsPort = configService.get('PORT_WS', { infer: true })!;

  appWs.useWebSocketAdapter(new IoAdapter(appWs));

  appWs.init();

  await appWs.listen(wsPort);

  console.log(`Server is running on ${url}`);
  console.log(`Ws is running on ${wsPort}`);
}

bootstrap();
