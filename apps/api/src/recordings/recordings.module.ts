import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSCRIPTION_QUEUE } from '../config/queue.config.js';
import { AudioStorage } from './application/ports/audio-storage.js';
import { RecordingRepository } from './application/ports/recording.repository.js';
import { TranscriptionPricing } from './application/ports/transcription-pricing.js';
import { TranscriptionQueue } from './application/ports/transcription-queue.js';
import { DeleteRecordingUseCase } from './application/use-cases/delete-recording.use-case.js';
import { GetRecordingUseCase } from './application/use-cases/get-recording.use-case.js';
import { GetTranscriptionCostsUseCase } from './application/use-cases/get-transcription-costs.use-case.js';
import { ListRecordingsUseCase } from './application/use-cases/list-recordings.use-case.js';
import { RetryRecordingUseCase } from './application/use-cases/retry-recording.use-case.js';
import { UploadRecordingUseCase } from './application/use-cases/upload-recording.use-case.js';
import { CostsController } from './infrastructure/http/costs.controller.js';
import { RecordingsController } from './infrastructure/http/recordings.controller.js';
import { OpenAiTranscriptionPricing } from './infrastructure/pricing/openai-transcription-pricing.js';
import { RecordingOrmEntity } from './infrastructure/persistence/recording.orm.entity.js';
import { TypeOrmRecordingRepository } from './infrastructure/persistence/typeorm-recording.repository.js';
import { BullMqTranscriptionQueue } from './infrastructure/queue/bullmq-transcription-queue.js';
import { S3AudioStorage } from './infrastructure/storage/s3-audio-storage.js';

/**
 * Composition root do lado HTTP: recebe uploads e só produz jobs (quem consome é o worker).
 * Os casos de uso não dependem do Nest, então são criados por factory.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingOrmEntity]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  controllers: [RecordingsController, CostsController],
  providers: [
    { provide: RecordingRepository, useClass: TypeOrmRecordingRepository },
    { provide: AudioStorage, useClass: S3AudioStorage },
    { provide: TranscriptionQueue, useClass: BullMqTranscriptionQueue },
    { provide: TranscriptionPricing, useClass: OpenAiTranscriptionPricing },
    {
      provide: GetTranscriptionCostsUseCase,
      useFactory: (r: RecordingRepository, p: TranscriptionPricing) =>
        new GetTranscriptionCostsUseCase(r, p),
      inject: [RecordingRepository, TranscriptionPricing],
    },
    {
      provide: ListRecordingsUseCase,
      useFactory: (r: RecordingRepository) => new ListRecordingsUseCase(r),
      inject: [RecordingRepository],
    },
    {
      provide: GetRecordingUseCase,
      useFactory: (r: RecordingRepository) => new GetRecordingUseCase(r),
      inject: [RecordingRepository],
    },
    {
      provide: UploadRecordingUseCase,
      useFactory: (
        r: RecordingRepository,
        s: AudioStorage,
        q: TranscriptionQueue,
      ) => new UploadRecordingUseCase(r, s, q),
      inject: [RecordingRepository, AudioStorage, TranscriptionQueue],
    },
    {
      provide: RetryRecordingUseCase,
      useFactory: (r: RecordingRepository, q: TranscriptionQueue) =>
        new RetryRecordingUseCase(r, q),
      inject: [RecordingRepository, TranscriptionQueue],
    },
    {
      provide: DeleteRecordingUseCase,
      useFactory: (r: RecordingRepository, s: AudioStorage) =>
        new DeleteRecordingUseCase(r, s),
      inject: [RecordingRepository, AudioStorage],
    },
  ],
})
export class RecordingsModule {}
