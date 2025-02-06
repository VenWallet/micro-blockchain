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
dotenv.config();

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);

  const httpsOptions = {
    cert: fs.readFileSync(process.env.SSL_CERT_PATH!),
    key: fs.readFileSync(process.env.SSL_KEY_PATH!),
  };
  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });

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

  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(port);
  console.log(`Server http is running on ${port}`);
}

bootstrap();
