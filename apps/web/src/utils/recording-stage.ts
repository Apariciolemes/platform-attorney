import type { Recording } from '@/types/recording'

export type StageTone = 'neutral' | 'progress' | 'success' | 'danger'

export interface RecordingStage {
  label: string
  tone: StageTone
  /** Ainda há processamento acontecendo (vale a pena atualizar a tela). */
  active: boolean
}

/** Junta os dois ciclos (transcrição e revisão do texto) numa etapa só, para exibir. */
export function recordingStage(rec: Recording): RecordingStage {
  switch (rec.status) {
    case 'pending':
      return { label: 'Na fila', tone: 'neutral', active: true }
    case 'processing':
      return { label: 'Transcrevendo', tone: 'progress', active: true }
    case 'failed':
      return { label: 'Falhou', tone: 'danger', active: false }
  }
  switch (rec.correctionStatus) {
    case 'pending':
    case 'processing':
      return { label: 'Revisando o texto', tone: 'progress', active: true }
    case 'failed':
      return { label: 'Revisão falhou', tone: 'danger', active: false }
    case 'completed':
      return { label: 'Pronto', tone: 'success', active: false }
    default:
      return { label: 'Transcrito', tone: 'success', active: false }
  }
}

export const stageBadgeClass: Record<StageTone, string> = {
  neutral: 'badge-pending',
  progress: 'badge-processing',
  success: 'badge-completed',
  danger: 'badge-failed',
}

/** Melhor texto disponível para leitura: o revisado, senão a transcrição original. */
export function readableText(rec: Recording): string | null {
  return rec.correctedTranscript ?? rec.transcript
}

/** Divide o texto em parágrafos (linhas em branco ou quebras simples). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}
