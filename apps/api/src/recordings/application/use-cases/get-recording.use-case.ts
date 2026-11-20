import type { Recording } from '../../domain/recording.js';
import { RecordingNotFoundError } from '../../domain/recording.errors.js';
import type { RecordingRepository } from '../ports/recording.repository.js';

export class GetRecordingUseCase {
  constructor(private readonly recordings: RecordingRepository) {}

  async execute(id: string): Promise<Recording> {
    const recording = await this.recordings.findById(id);
    if (!recording) throw new RecordingNotFoundError(id);
    return recording;
  }
}
