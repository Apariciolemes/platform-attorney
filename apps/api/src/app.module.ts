import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ClientsModule } from './clients/clients.module.js';
import { RecordingsModule } from './recordings/recordings.module.js';
import { InfraModule } from './shared/infra.module.js';

@Module({
  imports: [InfraModule, ClientsModule, RecordingsModule],
  controllers: [AppController],
})
export class AppModule {}
