import { UnrecoverableError, type Job } from 'bullmq';
import type { TranscribeJobData } from '../../../config/queue.config.js';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import type { RecordTranscriptionFailureUseCase } from '../../application/use-cases/record-transcription-failure.use-case.js';
import type { TranscribeRecordingUseCase } from '../../application/use-cases/transcribe-recording.use-case.js';
import { TranscriptionProcessor } from './transcription.processor.js';

const job = (attemptsMade = 1, attempts = 3) =>
  ({
    data: { recordingId: 'r1' },
    attemptsMade,
    opts: { attempts },
  }) as unknown as Job<TranscribeJobData>;

describe('TranscriptionProcessor', () => {
  const transcribe = { execute: vi.fn() };
  const recordFailure = { execute: vi.fn() };
  let processor: TranscriptionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TranscriptionProcessor(
      transcribe as unknown as TranscribeRecordingUseCase,
      recordFailure as unknown as RecordTranscriptionFailureUseCase,
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
});
