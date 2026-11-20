import type { Recording } from '../../domain/recording.js';
import type { RecordingRepository } from '../ports/recording.repository.js';

export class ListRecordingsUseCase {
  constructor(private readonly recordings: RecordingRepository) {}

  execute(): Promise<Recording[]> {
    return this.recordings.findAll();
  }
}
