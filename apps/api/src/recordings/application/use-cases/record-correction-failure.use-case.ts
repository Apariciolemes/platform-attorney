import type { RecordingRepository } from '../ports/recording.repository.js';

export interface CorrectionFailure {
  recordingId: string;
  message: string;
  /** Se a fila ainda vai tentar de novo. */
  willRetry: boolean;
}

/** Registra uma falha na revisão do texto: volta para pendente ou falha de vez (o original continua valendo). */
export class RecordCorrectionFailureUseCase {
  constructor(private readonly recordings: RecordingRepository) {}

  async execute(failure: CorrectionFailure): Promise<void> {
    const recording = await this.recordings.findById(failure.recordingId);
    if (!recording) return;

    recording.registerCorrectionFailure(failure.message, failure.willRetry);
    await this.recordings.save(recording);
  }
}
