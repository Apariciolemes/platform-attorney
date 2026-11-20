import type { Recording } from '../../domain/recording.js';
import { RecordingNotFoundError } from '../../domain/recording.errors.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { TranscriptionQueue } from '../ports/transcription-queue.js';

/** Pedido manual para (re)revisar o texto: após uma falha, ou para gravações anteriores à revisão. */
export class RequestCorrectionUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly queue: TranscriptionQueue,
  ) {}

  async execute(id: string): Promise<Recording> {
    const recording = await this.recordings.findById(id);
    if (!recording) throw new RecordingNotFoundError(id);

    recording.requestCorrection();
    await this.recordings.save(recording);
    await this.queue.enqueueCorrection(recording.id);
    return recording;
  }
}
