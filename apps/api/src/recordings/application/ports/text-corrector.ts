import type { Correction } from '../../domain/recording.js';

/**
 * Port: revisa um texto transcrito (concordância, pontuação, clareza) sem mudar o sentido.
 * Falhas que não melhoram com nova tentativa usam NonRetryableTranscriptionError.
 */
export abstract class TextCorrector {
  abstract correct(text: string): Promise<Correction>;
}
