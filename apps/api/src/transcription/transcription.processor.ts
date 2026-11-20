import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { StorageDisk } from '@nestjs/storage';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { basename } from 'node:path';
import { Repository } from 'typeorm';
import {
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../config/queue.config.js';
import {
  Recording,
  RecordingStatus,
} from '../recordings/entities/recording.entity.js';
import { WhisperTranscriber } from './whisper-transcriber.js';

@Processor(TRANSCRIPTION_QUEUE)
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    private readonly disk: StorageDisk,
    private readonly transcriber: WhisperTranscriber,
  ) {
    super();
  }

  async process(job: Job<TranscribeJobData>): Promise<void> {
    const { recordingId } = job.data;
    const recording = await this.recordingsRepository.findOneBy({
      id: recordingId,
    });
    if (!recording) {
      // Gravação apagada enquanto esperava na fila: nada a fazer.
      this.logger.warn(`Gravação ${recordingId} não existe mais; job ignorado`);
      return;
    }

    await this.recordingsRepository.update(recordingId, {
      status: RecordingStatus.Processing,
      error: null,
    });

    const audio = await this.disk.getBuffer(recording.storageKey);
    const result = await this.transcriber.transcribe({
      audio,
      filename: basename(recording.storageKey),
      mimeType: recording.mimeType,
    });

    await this.recordingsRepository.update(recordingId, {
      status: RecordingStatus.Completed,
      transcript: result.text,
      language: result.language,
      durationSeconds: result.durationSeconds,
      error: null,
    });
    this.logger.log(`Gravação ${recordingId} transcrita`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TranscribeJobData> | undefined, error: Error) {
    if (!job) return;
    const isFinal =
      error.name === 'UnrecoverableError' ||
      job.attemptsMade >= (job.opts.attempts ?? 1);

    this.logger.error(
      `Transcrição de ${job.data.recordingId} falhou (tentativa ${job.attemptsMade}${isFinal ? ', definitiva' : ''}): ${error.message}`,
    );
    await this.recordingsRepository.update(job.data.recordingId, {
      // Entre tentativas volta para "pending"; na última fica "failed".
      status: isFinal ? RecordingStatus.Failed : RecordingStatus.Pending,
      error: error.message,
    });
  }
}
