import { InMemoryDisk } from '@nestjs/storage';
import { UnrecoverableError, type Job } from 'bullmq';
import type { Repository } from 'typeorm';
import type { TranscribeJobData } from '../config/queue.config.js';
import {
  Recording,
  RecordingStatus,
} from '../recordings/entities/recording.entity.js';
import type { GroqTranscriber } from './groq-transcriber.js';
import { TranscriptionProcessor } from './transcription.processor.js';

const job = (attemptsMade = 1, attempts = 3) =>
  ({
    data: { recordingId: 'r1' },
    attemptsMade,
    opts: { attempts },
  }) as unknown as Job<TranscribeJobData>;

describe('TranscriptionProcessor', () => {
  let disk: InMemoryDisk;
  let processor: TranscriptionProcessor;
  const repo = { findOneBy: vi.fn(), update: vi.fn() };
  const transcriber = { transcribe: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    disk = new InMemoryDisk();
    await disk.put('recordings/r1.mp3', 'audio-bytes');
    processor = new TranscriptionProcessor(
      repo as unknown as Repository<Recording>,
      disk,
      transcriber as unknown as GroqTranscriber,
    );
  });

  it('transcreve o áudio e grava o resultado', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 'r1',
      storageKey: 'recordings/r1.mp3',
      mimeType: 'audio/mpeg',
    });
    transcriber.transcribe.mockResolvedValue({
      text: 'olá mundo',
      language: 'portuguese',
      durationSeconds: 2.5,
    });

    await processor.process(job());

    expect(transcriber.transcribe).toHaveBeenCalledWith({
      audio: Buffer.from('audio-bytes'),
      filename: 'r1.mp3',
      mimeType: 'audio/mpeg',
    });
    expect(repo.update).toHaveBeenNthCalledWith(1, 'r1', {
      status: RecordingStatus.Processing,
      error: null,
    });
    expect(repo.update).toHaveBeenLastCalledWith('r1', {
      status: RecordingStatus.Completed,
      transcript: 'olá mundo',
      language: 'portuguese',
      durationSeconds: 2.5,
      error: null,
    });
  });

  it('ignora job de gravação apagada', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await processor.process(job());
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('volta para pendente entre tentativas', async () => {
    await processor.onFailed(job(1, 3), new Error('timeout'));
    expect(repo.update).toHaveBeenCalledWith('r1', {
      status: RecordingStatus.Pending,
      error: 'timeout',
    });
  });

  it('marca como falha na última tentativa', async () => {
    await processor.onFailed(job(3, 3), new Error('timeout'));
    expect(repo.update).toHaveBeenCalledWith('r1', {
      status: RecordingStatus.Failed,
      error: 'timeout',
    });
  });

  it('marca como falha na hora em erro irrecuperável', async () => {
    await processor.onFailed(job(1, 3), new UnrecoverableError('chave'));
    expect(repo.update).toHaveBeenCalledWith('r1', {
      status: RecordingStatus.Failed,
      error: 'chave',
    });
  });
});
