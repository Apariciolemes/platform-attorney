import type { RecordingStatus } from './recording'

export interface TranscriptionPrice {
  provider: string
  model: string
  usdPerMinute: number | null
  sourceUrl: string | null
  checkedAt: string | null
  shutdownDate: string | null
  replacementModel: string | null
  replacementUsdPerMinute: number | null
}

export interface TokenPrice {
  model: string
  usdPerMillionInputTokens: number
  usdPerMillionOutputTokens: number
}

export interface RecordingCost {
  recordingId: string
  originalName: string
  status: RecordingStatus
  createdAt: string
  durationSeconds: number | null
  transcriptionCostUsd: number | null
  correctionCostUsd: number | null
  costUsd: number | null
}

export interface TranscriptionCosts {
  pricing: TranscriptionPrice
  correction: { model: string; price: TokenPrice | null }
  recordings: RecordingCost[]
  totals: {
    transcribedRecordings: number
    transcribedSeconds: number
    transcriptionCostUsd: number | null
    correctionCostUsd: number
    costUsd: number | null
  }
}
