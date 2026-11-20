import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSCRIPTION_QUEUE } from './config/queue.config.js';
import { Recording } from './recordings/entities/recording.entity.js';
import { InfraModule } from './shared/infra.module.js';
import { GroqTranscriber } from './transcription/groq-transcriber.js';
import { TranscriptionProcessor } from './transcription/transcription.processor.js';

/** Processo do worker: consome a fila de transcrição, sem servidor HTTP. */
@Module({
  imports: [
    InfraModule,
    TypeOrmModule.forFeature([Recording]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  providers: [GroqTranscriber, TranscriptionProcessor],
})
export class WorkerModule {}
