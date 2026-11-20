export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** Revisão do texto por IA, depois da transcrição. */
export type CorrectionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Recording {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  status: RecordingStatus
  transcript: string | null
  language: string | null
  durationSeconds: number | null
  error: string | null
  correctionStatus: CorrectionStatus | null
  correctedTranscript: string | null
  correctionError: string | null
  correctionModel: string | null
  correctionInputTokens: number | null
  correctionOutputTokens: number | null
  createdAt: string
  updatedAt: string
}
