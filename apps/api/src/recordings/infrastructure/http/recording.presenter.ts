import type { Recording } from '../../domain/recording.js';

/** Formato JSON exposto pela API (mantém o contrato usado pelo frontend). */
export function presentRecording(recording: Recording) {
  return recording.toSnapshot();
}
