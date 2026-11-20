import type { RecordingRepository } from '../ports/recording.repository.js';

export interface TranscriptionFailure {
  recordingId: string;
  message: string;
  /** Se a fila ainda vai tentar de novo. */
  willRetry: boolean;
}

/** Registra uma falha de transcrição: volta para pendente ou falha de vez. */
export class RecordTranscriptionFailureUseCase {
  constructor(private readonly recordings: RecordingRepository) {}

  async execute(failure: TranscriptionFailure): Promise<void> {
    const recording = await this.recordings.findById(failure.recordingId);
    if (!recording) return;

    recording.registerFailure(failure.message, failure.willRetry);
    await this.recordings.save(recording);
  }
}
