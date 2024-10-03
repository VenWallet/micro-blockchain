import * as dotenv from 'dotenv';
dotenv.config();
import { DataSourceOptions } from 'typeorm';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.HOST_ORM,
  port: Number(process.env.PORT_ORM),
  username: process.env.USER_ORM,
  password: process.env.PASSWORD_ORM,
  database: process.env.DATABASE_ORM,
  entities: [__dirname + '/../../modules/**/entities/*{.ts,.js}'],
  migrations: [
    __dirname + `/../../${process.env.NODE_ENV === 'production' ? 'migrations.prod' : 'migrations.dev'}/*.ts`,
  ],
  migrationsRun: true,
  synchronize: true,
  ssl: {
    rejectUnauthorized: false,
  },
};

export default config;
