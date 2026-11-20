import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { ClientsModule } from './clients/clients.module.js';
import { buildDataSourceOptions } from './config/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
    ClientsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
