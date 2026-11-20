import { Module } from '@nestjs/common';
import { RecordingsWorkerModule } from './recordings/recordings-worker.module.js';
import { InfraModule } from './shared/infrastructure/infra.module.js';

/** Processo do worker: consome a fila de transcrição, sem servidor HTTP. */
@Module({
  imports: [InfraModule, RecordingsWorkerModule],
})
export class WorkerModule {}
