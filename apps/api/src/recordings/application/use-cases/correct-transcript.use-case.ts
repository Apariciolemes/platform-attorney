import { CorrectionStatus } from '../../domain/recording.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { TextCorrector } from '../ports/text-corrector.js';

export type CorrectOutcome = 'completed' | 'skipped';

/** Executado pelo worker: revisa o texto transcrito e grava a versão revisada. */
export class CorrectTranscriptUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly corrector: TextCorrector,
  ) {}

  async execute(recordingId: string): Promise<CorrectOutcome> {
    const recording = await this.recordings.findById(recordingId);
    // Gravação apagada, sem texto ou com revisão cancelada enquanto esperava na fila.
    if (
      !recording?.transcript ||
      recording.correctionStatus !== CorrectionStatus.Pending
    ) {
      return 'skipped';
    }

    recording.startCorrection();
    await this.recordings.save(recording);

    const correction = await this.corrector.correct(recording.transcript);

    recording.completeCorrection(correction);
    await this.recordings.save(recording);
    return 'completed';
  }
}
