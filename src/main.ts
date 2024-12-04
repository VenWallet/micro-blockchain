import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './config/env';
import { DatabaseConfig } from './config/database/database.config';
import { SolanaService } from './modules/blockchain/protocols/solana/solana.service';
import { EthereumService } from './modules/blockchain/protocols/ethereum/ethereum.service';
import { ArbitrumService } from './modules/blockchain/protocols/arbitrum/arbitrum.service';
import { BitcoinService } from './modules/blockchain/protocols/bitcoin/bitcoin.service';
import { BinanceService } from './modules/blockchain/protocols/binance/binance.service';
import { TasksService } from './tasks/tasks.service';

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

  console.log(`Server is running on ${url}`);

  // const service = app.get(TasksService);

  // console.log(await service.withdraw('USDC', '0x95Ffb8cE9E6B2657Bca6Dd432c246e8FA504fB9E', 23.76, 'BSC', 6));
}

bootstrap();
