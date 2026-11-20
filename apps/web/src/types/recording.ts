export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'

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
  createdAt: string
  updatedAt: string
}
