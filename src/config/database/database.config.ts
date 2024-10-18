import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { EnvironmentVariables } from '../env';

@Injectable()
export class DatabaseConfig {
  static getDataSourceOptions(): DataSourceOptions {
    const configService = new ConfigService<EnvironmentVariables>();

    const environment = configService.get<string>('NODE_ENV');
    const migrationsPath = environment === 'production' ? 'migrations.prod' : 'migrations.dev';

    return {
      type: 'postgres',
      host: configService.get<string>('HOST_ORM'),
      port: configService.get<number>('PORT_ORM'),
      username: configService.get<string>('USER_ORM'),
      password: configService.get<string>('PASSWORD_ORM'),
      database: configService.get<string>('DATABASE_ORM'),
      entities: [__dirname + '/../../modules/**/entities/*{.ts,.js}'],
      migrations: [__dirname + `/../../${migrationsPath}/*.ts`],
      migrationsRun: true,
      synchronize: true,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }
}
