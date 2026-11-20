import { Recording, RecordingStatus } from '../domain/recording.js';
import { estimateTranscriptionCost } from '../domain/transcription-cost.js';
import { RecordingRepository } from './ports/recording.repository.js';
import {
  type TokenPrice,
  type TranscriptionPrice,
  TranscriptionPricing,
} from './ports/transcription-pricing.js';
import { GetTranscriptionCostsUseCase } from './use-cases/get-transcription-costs.use-case.js';

class FakeRepository extends RecordingRepository {
  constructor(private readonly items: Recording[]) {
    super();
  }
  findAll() {
    return Promise.resolve(this.items);
  }
  findById() {
    return Promise.resolve(null);
  }
  save() {
    return Promise.resolve();
  }
  delete() {
    return Promise.resolve();
  }
}

class FixedPricing extends TranscriptionPricing {
  constructor(private readonly usdPerMinute: number | null) {
    super();
  }
  current(): TranscriptionPrice {
    return {
      provider: 'OpenAI',
      model: 'whisper-1',
      usdPerMinute: this.usdPerMinute,
      sourceUrl: null,
      checkedAt: null,
      shutdownDate: null,
      replacementModel: null,
      replacementUsdPerMinute: null,
    };
  }
  currentCorrection() {
    return { model: 'gpt-6-luna', price: this.correctionPrice('gpt-6-luna') };
  }
  correctionPrice(model: string): TokenPrice | null {
    return model === 'gpt-6-luna'
      ? { model, usdPerMillionInputTokens: 0.1, usdPerMillionOutputTokens: 0.5 }
      : null;
  }
}

function recording(
  status: RecordingStatus,
  durationSeconds: number | null,
): Recording {
  const base = Recording.create({
    originalName: `${status}.mp3`,
    mimeType: 'audio/mpeg',
    sizeBytes: 1,
  }).toSnapshot();
  return Recording.restore({ ...base, status, durationSeconds });
}

describe('estimateTranscriptionCost', () => {
  it('é proporcional à duração em minutos', () => {
    expect(estimateTranscriptionCost(60, 0.006)).toBeCloseTo(0.006);
    expect(estimateTranscriptionCost(90, 0.006)).toBeCloseTo(0.009);
    expect(estimateTranscriptionCost(3600, 0.006)).toBeCloseTo(0.36);
  });

  it('recusa valores negativos', () => {
    expect(() => estimateTranscriptionCost(-1, 0.006)).toThrow(RangeError);
  });
});

describe('GetTranscriptionCostsUseCase', () => {
  it('cobra só as gravações concluídas, pela duração', async () => {
    const repo = new FakeRepository([
      recording(RecordingStatus.Completed, 120),
      recording(RecordingStatus.Completed, 30),
      recording(RecordingStatus.Failed, null),
      recording(RecordingStatus.Pending, null),
    ]);

    const result = await new GetTranscriptionCostsUseCase(
      repo,
      new FixedPricing(0.006),
    ).execute();

    expect(result.recordings.map((r) => r.costUsd)).toEqual([
      expect.closeTo(0.012),
      expect.closeTo(0.003),
      null,
      null,
    ]);
    expect(result.totals.transcribedRecordings).toBe(2);
    expect(result.totals.transcribedSeconds).toBe(150);
    expect(result.totals.costUsd).toBeCloseTo(0.015);
  });

  it('não inventa custo quando o preço é desconhecido', async () => {
    const repo = new FakeRepository([recording(RecordingStatus.Completed, 60)]);

    const result = await new GetTranscriptionCostsUseCase(
      repo,
      new FixedPricing(null),
    ).execute();

    expect(result.recordings[0].costUsd).toBeNull();
    expect(result.totals).toEqual({
      transcribedRecordings: 1,
      transcribedSeconds: 60,
      transcriptionCostUsd: null,
      correctionCostUsd: 0,
      costUsd: null,
    });
  });

  it('soma a revisão pelos tokens gastos e pelo preço do modelo que revisou', async () => {
    const revised = Recording.restore({
      ...recording(RecordingStatus.Completed, 60).toSnapshot(),
      correctionModel: 'gpt-6-luna',
      correctionInputTokens: 1_000_000,
      correctionOutputTokens: 200_000,
    });
    const unknownModel = Recording.restore({
      ...recording(RecordingStatus.Completed, 60).toSnapshot(),
      correctionModel: 'modelo-desconhecido',
      correctionInputTokens: 10,
      correctionOutputTokens: 10,
    });

    const result = await new GetTranscriptionCostsUseCase(
      new FakeRepository([revised, unknownModel]),
      new FixedPricing(0.006),
    ).execute();

    // revisão: 1M × 0,10 + 0,2M × 0,50 = US$ 0,20
    expect(result.recordings[0]).toMatchObject({
      transcriptionCostUsd: expect.closeTo(0.006),
      correctionCostUsd: expect.closeTo(0.2),
      costUsd: expect.closeTo(0.206),
    });
    expect(result.recordings[1].correctionCostUsd).toBeNull();
    expect(result.totals.correctionCostUsd).toBeCloseTo(0.2);
    expect(result.totals.costUsd).toBeCloseTo(0.212);
    expect(result.correction.model).toBe('gpt-6-luna');
  });
});
