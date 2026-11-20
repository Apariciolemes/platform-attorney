import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError, type Job } from 'bullmq';
import {
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../../../config/queue.config.js';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { RecordTranscriptionFailureUseCase } from '../../application/use-cases/record-transcription-failure.use-case.js';
import { TranscribeRecordingUseCase } from '../../application/use-cases/transcribe-recording.use-case.js';

/**
 * Adapter de entrada da fila (BullMQ): traduz jobs em chamadas aos casos de uso
 * e a política de retry da aplicação para a do BullMQ.
 */
@Processor(TRANSCRIPTION_QUEUE)
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private readonly transcribeRecording: TranscribeRecordingUseCase,
    private readonly recordTranscriptionFailure: RecordTranscriptionFailureUseCase,
  ) {
    super();
  }

  async process(job: Job<TranscribeJobData>): Promise<void> {
    const { recordingId } = job.data;
    try {
      const outcome = await this.transcribeRecording.execute(recordingId);
      if (outcome === 'recording-missing') {
        this.logger.warn(
          `Gravação ${recordingId} não existe mais; job ignorado`,
        );
        return;
      }
      this.logger.log(`Gravação ${recordingId} transcrita`);
    } catch (error) {
      // Erro que não melhora com retry: o BullMQ encerra o job sem novas tentativas.
      if (error instanceof NonRetryableTranscriptionError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TranscribeJobData> | undefined, error: Error) {
    if (!job) return;
    const willRetry =
      error.name !== 'UnrecoverableError' &&
      job.attemptsMade < (job.opts.attempts ?? 1);

    this.logger.error(
      `Transcrição de ${job.data.recordingId} falhou (tentativa ${job.attemptsMade}${willRetry ? '' : ', definitiva'}): ${error.message}`,
    );
    await this.recordTranscriptionFailure.execute({
      recordingId: job.data.recordingId,
      message: error.message,
      willRetry,
    });
  }
}
