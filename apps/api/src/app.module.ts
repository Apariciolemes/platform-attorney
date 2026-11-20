import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { ClientsModule } from './clients/clients.module.js';
import { RecordingsModule } from './recordings/recordings.module.js';
import { DomainErrorFilter } from './shared/infrastructure/http/domain-error.filter.js';
import { InfraModule } from './shared/infrastructure/infra.module.js';

@Module({
  imports: [InfraModule, ClientsModule, RecordingsModule],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
