import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config/env';
import * as fs from 'fs';
import * as https from 'https';

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

  // await app.listen(port);

  // const url = await app.getUrl();

  // console.log(`Server is running on ${url}`);

  app.init();

  const httpsOptions = {
    key: fs.readFileSync('certs/ssl-key.pem'),
    cert: fs.readFileSync('certs/ssl-cert.pem'),
  };

  const httpsServer = https.createServer(httpsOptions, app.getHttpAdapter().getInstance());

  httpsServer.listen(port, () => {
    console.log(`✅ API REST y WebSockets en: https://localhost:${port}`);
  });
}

bootstrap();
