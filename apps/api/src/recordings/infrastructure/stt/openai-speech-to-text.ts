import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NonRetryableTranscriptionError,
  SpeechToText,
  type SpeechToTextInput,
} from '../../application/ports/speech-to-text.js';
import type { Transcript } from '../../domain/recording.js';

interface TranscriptionResponse {
  text: string;
  /** Só no formato verbose_json. */
  language?: string;
  duration?: number;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'whisper-1';
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Adapter: implementa o port SpeechToText com o endpoint `POST /audio/transcriptions`
 * no formato da API da OpenAI. Padrão: OpenAI Whisper. Com STT_BASE_URL, funciona com
 * qualquer serviço compatível (Groq: https://api.groq.com/openai/v1, ou um Whisper local).
 */
@Injectable()
export class OpenAiSpeechToText extends SpeechToText {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async transcribe(input: SpeechToTextInput): Promise<Transcript> {
    const apiKey = this.config.get<string>('STT_API_KEY');
    if (!apiKey) {
      throw new NonRetryableTranscriptionError('STT_API_KEY não configurada');
    }
    const baseUrl = (
      this.config.get<string>('STT_BASE_URL') || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    const model = this.config.get<string>('STT_MODEL') || DEFAULT_MODEL;

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
      input.filename,
    );
    form.append('model', model);
    // Modelos Whisper devolvem idioma e duração em verbose_json; os gpt-4o-*-transcribe só aceitam json.
    form.append(
      'response_format',
      model.startsWith('whisper') ? 'verbose_json' : 'json',
    );
    form.append('temperature', '0');
    const language = this.config.get<string>('TRANSCRIPTION_LANGUAGE');
    if (language) {
      form.append('language', language);
    }

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      const message = `Serviço de transcrição respondeu ${response.status}: ${body}`;
      // 4xx (arquivo inválido, chave errada…) não melhora com retry; 408/429 e 5xx sim.
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw retryable
        ? new Error(message)
        : new NonRetryableTranscriptionError(message);
    }

    const data = (await response.json()) as TranscriptionResponse;
    return {
      text: data.text.trim(),
      language: data.language ?? null,
      durationSeconds: data.duration ?? null,
    };
  }
}
