import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../config/database.config.js';

// Usado pela CLI do TypeORM (migration:run, migration:generate, ...).
export default new DataSource(buildDataSourceOptions());
