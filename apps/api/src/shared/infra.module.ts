import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '@nestjs/storage';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from '../config/database.config.js';
import { buildQueueConnection } from '../config/queue.config.js';
import { buildStorageOptions } from '../config/storage.config.js';

/**
 * Infraestrutura compartilhada pela API HTTP e pelo worker:
 * configuração, banco (TypeORM), storage S3 e conexão com o Redis (BullMQ).
 * Todos esses módulos são globais, então importar este módulo basta.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
    StorageModule.forRootAsync({
      useFactory: () => buildStorageOptions(),
    }),
    BullModule.forRootAsync({
      useFactory: () => ({ connection: buildQueueConnection() }),
    }),
  ],
})
export class InfraModule {}
