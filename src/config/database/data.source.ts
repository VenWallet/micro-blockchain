import { DataSource } from 'typeorm';
import config from './typeorm.config';

const dataSource = new DataSource(config);

export default dataSource;
