import {
  type RecordingProps,
  RecordingStatus,
} from '../../domain/recording.js';
import {
  estimateTokenCost,
  estimateTranscriptionCost,
} from '../../domain/transcription-cost.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type {
  TokenPrice,
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
  transcriptionCostUsd: number | null;
  /** Null quando o texto não foi revisado ou o preço do modelo é desconhecido. */
  correctionCostUsd: number | null;
  /** Soma das partes conhecidas; null se nenhuma for. */
  costUsd: number | null;
}

export interface TranscriptionCosts {
  pricing: TranscriptionPrice;
  correction: { model: string; price: TokenPrice | null };
  recordings: RecordingCost[];
  totals: {
    transcribedRecordings: number;
    transcribedSeconds: number;
    transcriptionCostUsd: number | null;
    correctionCostUsd: number;
    costUsd: number | null;
  };
}

/**
 * Custo estimado de cada gravação e o total:
 * - transcrição: duração × preço por minuto atual do modelo configurado;
 * - revisão do texto: tokens realmente gastos × preço do modelo que revisou.
 */
export class GetTranscriptionCostsUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly pricing: TranscriptionPricing,
  ) {}

  async execute(): Promise<TranscriptionCosts> {
    const price = this.pricing.current();
    const all = await this.recordings.findAll();

    const recordings = all.map((recording): RecordingCost => {
      const snapshot = recording.toSnapshot();
      const transcriptionCostUsd = this.transcriptionCost(
        billableSeconds(snapshot.status, snapshot.durationSeconds),
        price,
      );
      const correctionCostUsd = this.correctionCost(snapshot);
      return {
        recordingId: snapshot.id,
        originalName: snapshot.originalName,
        status: snapshot.status,
        createdAt: snapshot.createdAt,
        durationSeconds: snapshot.durationSeconds,
        transcriptionCostUsd,
        correctionCostUsd,
        costUsd: sumKnown(transcriptionCostUsd, correctionCostUsd),
      };
    });

    const billed = recordings.filter(
      (r) => billableSeconds(r.status, r.durationSeconds) != null,
    );
    const transcribedSeconds = billed.reduce(
      (sum, r) => sum + (r.durationSeconds ?? 0),
      0,
    );
    const transcriptionCostUsd = this.transcriptionCost(
      transcribedSeconds,
      price,
    );
    const correctionCostUsd = recordings.reduce(
      (sum, r) => sum + (r.correctionCostUsd ?? 0),
      0,
    );

    return {
      pricing: price,
      correction: this.pricing.currentCorrection(),
      recordings,
      totals: {
        transcribedRecordings: billed.length,
        transcribedSeconds,
        transcriptionCostUsd,
        correctionCostUsd,
        // Sem o preço da transcrição o total é desconhecido (não "US$ 0").
        costUsd:
          transcriptionCostUsd != null
            ? transcriptionCostUsd + correctionCostUsd
            : null,
      },
    };
  }

  private transcriptionCost(seconds: number | null, price: TranscriptionPrice) {
    return seconds != null && price.usdPerMinute != null
      ? estimateTranscriptionCost(seconds, price.usdPerMinute)
      : null;
  }

  private correctionCost(snapshot: Readonly<RecordingProps>): number | null {
    const { correctionModel, correctionInputTokens, correctionOutputTokens } =
      snapshot;
    if (
      !correctionModel ||
      correctionInputTokens == null ||
      correctionOutputTokens == null
    ) {
      return null;
    }
    const price = this.pricing.correctionPrice(correctionModel);
    return price
      ? estimateTokenCost(
          correctionInputTokens,
          correctionOutputTokens,
          price.usdPerMillionInputTokens,
          price.usdPerMillionOutputTokens,
        )
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

function sumKnown(...values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v != null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}
