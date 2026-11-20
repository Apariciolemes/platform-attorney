import { RecordingStatus } from '../../domain/recording.js';
import { estimateTranscriptionCost } from '../../domain/transcription-cost.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type {
  TranscriptionPrice,
  TranscriptionPricing,
} from '../ports/transcription-pricing.js';

export interface RecordingCost {
  recordingId: string;
  originalName: string;
  status: RecordingStatus;
  createdAt: Date;
  durationSeconds: number | null;
  /** Null quando não há custo calculável (não transcrita, sem duração ou preço desconhecido). */
  costUsd: number | null;
}

export interface TranscriptionCosts {
  pricing: TranscriptionPrice;
  recordings: RecordingCost[];
  totals: {
    transcribedRecordings: number;
    transcribedSeconds: number;
    costUsd: number | null;
  };
}

/** Custo estimado de cada gravação transcrita e o total, ao preço atual do modelo configurado. */
export class GetTranscriptionCostsUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly pricing: TranscriptionPricing,
  ) {}

  async execute(): Promise<TranscriptionCosts> {
    const price = this.pricing.current();
    const all = await this.recordings.findAll();

    const recordings = all.map((recording): RecordingCost => {
      const { id, originalName, status, createdAt, durationSeconds } =
        recording.toSnapshot();
      return {
        recordingId: id,
        originalName,
        status,
        createdAt,
        durationSeconds,
        costUsd: this.cost(billableSeconds(status, durationSeconds), price),
      };
    });

    const billed = recordings.filter(
      (r) => billableSeconds(r.status, r.durationSeconds) != null,
    );
    const transcribedSeconds = billed.reduce(
      (sum, r) => sum + (r.durationSeconds ?? 0),
      0,
    );

    return {
      pricing: price,
      recordings,
      totals: {
        transcribedRecordings: billed.length,
        transcribedSeconds,
        costUsd: this.cost(transcribedSeconds, price),
      },
    };
  }

  private cost(seconds: number | null, price: TranscriptionPrice) {
    return seconds != null && price.usdPerMinute != null
      ? estimateTranscriptionCost(seconds, price.usdPerMinute)
      : null;
  }
}

/** Só transcrições concluídas e com duração geram cobrança; falhas são recusadas pelo provedor. */
function billableSeconds(
  status: RecordingStatus,
  durationSeconds: number | null,
): number | null {
  return status === RecordingStatus.Completed ? durationSeconds : null;
}
