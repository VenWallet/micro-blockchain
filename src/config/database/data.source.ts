import { DataSource } from 'typeorm';
import { DatabaseConfig } from './database.config';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../env';

const dataSource = new DataSource(DatabaseConfig.getDataSourceOptions());

export default dataSource;
