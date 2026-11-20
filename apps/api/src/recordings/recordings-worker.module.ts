import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSCRIPTION_QUEUE } from '../config/queue.config.js';
import { AudioStorage } from './application/ports/audio-storage.js';
import { RecordingRepository } from './application/ports/recording.repository.js';
import { SpeechToText } from './application/ports/speech-to-text.js';
import { RecordTranscriptionFailureUseCase } from './application/use-cases/record-transcription-failure.use-case.js';
import { TranscribeRecordingUseCase } from './application/use-cases/transcribe-recording.use-case.js';
import { RecordingOrmEntity } from './infrastructure/persistence/recording.orm.entity.js';
import { TypeOrmRecordingRepository } from './infrastructure/persistence/typeorm-recording.repository.js';
import { TranscriptionProcessor } from './infrastructure/queue/transcription.processor.js';
import { S3AudioStorage } from './infrastructure/storage/s3-audio-storage.js';
import { OpenAiSpeechToText } from './infrastructure/stt/openai-speech-to-text.js';

/** Composition root do worker: consome a fila de transcrição. */
@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingOrmEntity]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  providers: [
    { provide: RecordingRepository, useClass: TypeOrmRecordingRepository },
    { provide: AudioStorage, useClass: S3AudioStorage },
    { provide: SpeechToText, useClass: OpenAiSpeechToText },
    {
      provide: TranscribeRecordingUseCase,
      useFactory: (r: RecordingRepository, s: AudioStorage, t: SpeechToText) =>
        new TranscribeRecordingUseCase(r, s, t),
      inject: [RecordingRepository, AudioStorage, SpeechToText],
    },
    {
      provide: RecordTranscriptionFailureUseCase,
      useFactory: (r: RecordingRepository) =>
        new RecordTranscriptionFailureUseCase(r),
      inject: [RecordingRepository],
    },
    TranscriptionProcessor,
  ],
})
export class RecordingsWorkerModule {}
