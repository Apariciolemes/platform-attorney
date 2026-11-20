import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';

export interface TranscriptionInput {
  audio: Buffer;
  filename: string;
  mimeType: string;
}

export interface TranscriptionResult {
  text: string;
  language: string | null;
  durationSeconds: number | null;
}

interface GroqVerboseTranscription {
  text: string;
  language?: string;
  duration?: number;
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 120_000;

/** Cliente mínimo do endpoint de transcrição da Groq (compatível com a API da OpenAI). */
@Injectable()
export class GroqTranscriber {
  constructor(private readonly config: ConfigService) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      // Tentar de novo não resolve: falha a gravação na hora.
      throw new UnrecoverableError('GROQ_API_KEY não configurada');
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
      input.filename,
    );
    form.append(
      'model',
      this.config.get<string>('GROQ_STT_MODEL') ?? 'whisper-large-v3',
    );
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    const language = this.config.get<string>('TRANSCRIPTION_LANGUAGE');
    if (language) {
      form.append('language', language);
    }

    const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      const message = `Groq respondeu ${response.status}: ${body}`;
      // 4xx (arquivo inválido, chave errada…) não melhora com retry; 408/429 e 5xx sim.
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw retryable ? new Error(message) : new UnrecoverableError(message);
    }

    const data = (await response.json()) as GroqVerboseTranscription;
    return {
      text: data.text.trim(),
      language: data.language ?? null,
      durationSeconds: data.duration ?? null,
    };
  }
}
