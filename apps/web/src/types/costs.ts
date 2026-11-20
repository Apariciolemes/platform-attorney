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

export interface RecordingCost {
  recordingId: string
  originalName: string
  status: RecordingStatus
  createdAt: string
  durationSeconds: number | null
  costUsd: number | null
}

export interface TranscriptionCosts {
  pricing: TranscriptionPrice
  recordings: RecordingCost[]
  totals: {
    transcribedRecordings: number
    transcribedSeconds: number
    costUsd: number | null
  }
}
