import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError, type Job } from 'bullmq';
import {
  CORRECT_TRANSCRIPT_JOB,
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../../../config/queue.config.js';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { CorrectTranscriptUseCase } from '../../application/use-cases/correct-transcript.use-case.js';
import { RecordCorrectionFailureUseCase } from '../../application/use-cases/record-correction-failure.use-case.js';
import { RecordTranscriptionFailureUseCase } from '../../application/use-cases/record-transcription-failure.use-case.js';
import { TranscribeRecordingUseCase } from '../../application/use-cases/transcribe-recording.use-case.js';

/**
 * Adapter de entrada da fila (BullMQ): traduz jobs em chamadas aos casos de uso
 * e a política de retry da aplicação para a do BullMQ.
 * Jobs: "transcribe" (áudio → texto) e "correct-transcript" (revisão do texto).
 */
@Processor(TRANSCRIPTION_QUEUE)
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private readonly transcribeRecording: TranscribeRecordingUseCase,
    private readonly recordTranscriptionFailure: RecordTranscriptionFailureUseCase,
    private readonly correctTranscript: CorrectTranscriptUseCase,
    private readonly recordCorrectionFailure: RecordCorrectionFailureUseCase,
  ) {
    super();
  }

  async process(job: Job<TranscribeJobData>): Promise<void> {
    const { recordingId } = job.data;
    try {
      if (isCorrection(job)) {
        const outcome = await this.correctTranscript.execute(recordingId);
        this.logger.log(
          outcome === 'completed'
            ? `Texto da gravação ${recordingId} revisado`
            : `Revisão de ${recordingId} ignorada (gravação apagada ou revisão não pendente)`,
        );
        return;
      }

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
    const failure = {
      recordingId: job.data.recordingId,
      message: error.message,
      willRetry,
    };

    this.logger.error(
      `${isCorrection(job) ? 'Revisão' : 'Transcrição'} de ${job.data.recordingId} falhou (tentativa ${job.attemptsMade}${willRetry ? '' : ', definitiva'}): ${error.message}`,
    );
    if (isCorrection(job)) {
      await this.recordCorrectionFailure.execute(failure);
    } else {
      await this.recordTranscriptionFailure.execute(failure);
    }
  }
}

function isCorrection(job: Job): boolean {
  return job.name === CORRECT_TRANSCRIPT_JOB;
}
