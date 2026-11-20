import type { Recording } from '../../domain/recording.js';
import { RecordingNotFoundError } from '../../domain/recording.errors.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { TranscriptionQueue } from '../ports/transcription-queue.js';

/** Reenfileira uma gravação que falhou (ou ficou presa como pendente). */
export class RetryRecordingUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly queue: TranscriptionQueue,
  ) {}

  async execute(id: string): Promise<Recording> {
    const recording = await this.recordings.findById(id);
    if (!recording) throw new RecordingNotFoundError(id);

    recording.requestRetry();
    await this.recordings.save(recording);
    await this.queue.enqueue(recording.id);
    return recording;
  }
}
