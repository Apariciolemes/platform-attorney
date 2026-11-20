import type { Transcript } from '../../domain/recording.js';

export interface SpeechToTextInput {
  audio: Buffer;
  filename: string;
  mimeType: string;
}

/**
 * Falha que não melhora tentando de novo (chave inválida, arquivo recusado…).
 * O adapter de fila usa isso para não gastar novas tentativas.
 */
export class NonRetryableTranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableTranscriptionError';
  }
}

/** Port do serviço de speech-to-text (OpenAI, Groq, Whisper local…). */
export abstract class SpeechToText {
  abstract transcribe(input: SpeechToTextInput): Promise<Transcript>;
}
