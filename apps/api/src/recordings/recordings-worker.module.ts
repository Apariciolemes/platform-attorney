import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSCRIPTION_QUEUE } from '../config/queue.config.js';
import { AudioStorage } from './application/ports/audio-storage.js';
import { RecordingRepository } from './application/ports/recording.repository.js';
import { SpeechToText } from './application/ports/speech-to-text.js';
import { TextCorrector } from './application/ports/text-corrector.js';
import { TranscriptionQueue } from './application/ports/transcription-queue.js';
import { CorrectTranscriptUseCase } from './application/use-cases/correct-transcript.use-case.js';
import { RecordCorrectionFailureUseCase } from './application/use-cases/record-correction-failure.use-case.js';
import { RecordTranscriptionFailureUseCase } from './application/use-cases/record-transcription-failure.use-case.js';
import { TranscribeRecordingUseCase } from './application/use-cases/transcribe-recording.use-case.js';
import { OpenAiTextCorrector } from './infrastructure/correction/openai-text-corrector.js';
import { RecordingOrmEntity } from './infrastructure/persistence/recording.orm.entity.js';
import { TypeOrmRecordingRepository } from './infrastructure/persistence/typeorm-recording.repository.js';
import { BullMqTranscriptionQueue } from './infrastructure/queue/bullmq-transcription-queue.js';
import { TranscriptionProcessor } from './infrastructure/queue/transcription.processor.js';
import { S3AudioStorage } from './infrastructure/storage/s3-audio-storage.js';
import { OpenAiSpeechToText } from './infrastructure/stt/openai-speech-to-text.js';

/** Composition root do worker: consome a fila (transcrição e revisão do texto). */
@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingOrmEntity]),
    BullModule.registerQueue({ name: TRANSCRIPTION_QUEUE }),
  ],
  providers: [
    { provide: RecordingRepository, useClass: TypeOrmRecordingRepository },
    { provide: AudioStorage, useClass: S3AudioStorage },
    { provide: SpeechToText, useClass: OpenAiSpeechToText },
    { provide: TextCorrector, useClass: OpenAiTextCorrector },
    { provide: TranscriptionQueue, useClass: BullMqTranscriptionQueue },
    {
      provide: TranscribeRecordingUseCase,
      useFactory: (
        r: RecordingRepository,
        s: AudioStorage,
        t: SpeechToText,
        q: TranscriptionQueue,
        config: ConfigService,
      ) =>
        new TranscribeRecordingUseCase(r, s, t, q, {
          // Revisão por IA ligada por padrão; CORRECTION_ENABLED=false desliga.
          correctionEnabled: config.get('CORRECTION_ENABLED') !== 'false',
        }),
      inject: [
        RecordingRepository,
        AudioStorage,
        SpeechToText,
        TranscriptionQueue,
        ConfigService,
      ],
    },
    {
      provide: RecordTranscriptionFailureUseCase,
      useFactory: (r: RecordingRepository) =>
        new RecordTranscriptionFailureUseCase(r),
      inject: [RecordingRepository],
    },
    {
      provide: CorrectTranscriptUseCase,
      useFactory: (r: RecordingRepository, c: TextCorrector) =>
        new CorrectTranscriptUseCase(r, c),
      inject: [RecordingRepository, TextCorrector],
    },
    {
      provide: RecordCorrectionFailureUseCase,
      useFactory: (r: RecordingRepository) =>
        new RecordCorrectionFailureUseCase(r),
      inject: [RecordingRepository],
    },
    TranscriptionProcessor,
  ],
})
export class RecordingsWorkerModule {}
