import { RecordingNotFoundError } from '../../domain/recording.errors.js';
import type { AudioStorage } from '../ports/audio-storage.js';
import type { RecordingRepository } from '../ports/recording.repository.js';

/** Apaga o arquivo do storage e o registro da gravação. */
export class DeleteRecordingUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly storage: AudioStorage,
  ) {}

  async execute(id: string): Promise<void> {
    const recording = await this.recordings.findById(id);
    if (!recording) throw new RecordingNotFoundError(id);

    await this.storage.delete(recording.storageKey);
    await this.recordings.delete(recording.id);
  }
}
