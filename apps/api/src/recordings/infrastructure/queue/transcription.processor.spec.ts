import { UnrecoverableError, type Job } from 'bullmq';
import {
  CORRECT_TRANSCRIPT_JOB,
  TRANSCRIBE_JOB,
  type TranscribeJobData,
} from '../../../config/queue.config.js';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import type { CorrectTranscriptUseCase } from '../../application/use-cases/correct-transcript.use-case.js';
import type { RecordCorrectionFailureUseCase } from '../../application/use-cases/record-correction-failure.use-case.js';
import type { RecordTranscriptionFailureUseCase } from '../../application/use-cases/record-transcription-failure.use-case.js';
import type { TranscribeRecordingUseCase } from '../../application/use-cases/transcribe-recording.use-case.js';
import { TranscriptionProcessor } from './transcription.processor.js';

const job = (attemptsMade = 1, attempts = 3, name = TRANSCRIBE_JOB) =>
  ({
    name,
    data: { recordingId: 'r1' },
    attemptsMade,
    opts: { attempts },
  }) as unknown as Job<TranscribeJobData>;

describe('TranscriptionProcessor', () => {
  const transcribe = { execute: vi.fn() };
  const recordFailure = { execute: vi.fn() };
  const correct = { execute: vi.fn() };
  const recordCorrectionFailure = { execute: vi.fn() };
  let processor: TranscriptionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TranscriptionProcessor(
      transcribe as unknown as TranscribeRecordingUseCase,
      recordFailure as unknown as RecordTranscriptionFailureUseCase,
      correct as unknown as CorrectTranscriptUseCase,
      recordCorrectionFailure as unknown as RecordCorrectionFailureUseCase,
    );
  });

  it('delega o job ao caso de uso de transcrição', async () => {
    transcribe.execute.mockResolvedValue('completed');

    await processor.process(job());

    expect(transcribe.execute).toHaveBeenCalledWith('r1');
  });

  it('converte erro sem retry da aplicação em UnrecoverableError do BullMQ', async () => {
    transcribe.execute.mockRejectedValue(
      new NonRetryableTranscriptionError('chave'),
    );

    await expect(processor.process(job())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('repassa erros comuns para o BullMQ tentar de novo', async () => {
    transcribe.execute.mockRejectedValue(new Error('timeout'));

    const error = await processor.process(job()).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(UnrecoverableError);
  });

  it.each([
    ['ainda há tentativas', job(1, 3), new Error('timeout'), true],
    ['última tentativa', job(3, 3), new Error('timeout'), false],
    ['erro irrecuperável', job(1, 3), new UnrecoverableError('chave'), false],
  ])('registra a falha (%s)', async (_label, failedJob, error, willRetry) => {
    await processor.onFailed(failedJob, error);

    expect(recordFailure.execute).toHaveBeenCalledWith({
      recordingId: 'r1',
      message: error.message,
      willRetry,
    });
  });

  describe('job de revisão do texto', () => {
    const correctionJob = (attemptsMade = 1) =>
      job(attemptsMade, 3, CORRECT_TRANSCRIPT_JOB);

    it('delega ao caso de uso de revisão, não ao de transcrição', async () => {
      correct.execute.mockResolvedValue('completed');

      await processor.process(correctionJob());

      expect(correct.execute).toHaveBeenCalledWith('r1');
      expect(transcribe.execute).not.toHaveBeenCalled();
    });

    it('converte erro sem retry em UnrecoverableError', async () => {
      correct.execute.mockRejectedValue(
        new NonRetryableTranscriptionError('sem créditos'),
      );

      await expect(processor.process(correctionJob())).rejects.toBeInstanceOf(
        UnrecoverableError,
      );
    });

    it('registra a falha como falha da revisão, não da transcrição', async () => {
      await processor.onFailed(correctionJob(3), new Error('timeout'));

      expect(recordCorrectionFailure.execute).toHaveBeenCalledWith({
        recordingId: 'r1',
        message: 'timeout',
        willRetry: false,
      });
      expect(recordFailure.execute).not.toHaveBeenCalled();
    });
  });
});
