import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NonRetryableTranscriptionError,
  SpeechToText,
  type SpeechToTextInput,
} from '../../application/ports/speech-to-text.js';
import type { Transcript } from '../../domain/recording.js';
import { openAiError } from '../openai/openai-error.js';
import { openAiUploadFile } from './openai-audio-format.js';

/**
 * Resposta de POST /audio/transcriptions. Varia por modelo (conferido em chamadas reais):
 * - whisper-1 (verbose_json): `language` ("portuguese") e `duration` (segundos exatos);
 * - gpt-transcribe (só json/text): `languages` ([{ code: "pt" }]) e
 *   `usage: { type: "duration", seconds }`, os segundos cobrados (arredondados para cima).
 * Modelos cobrados por token devolvem `usage.type: "tokens"`, sem duração.
 */
interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  languages?: { code?: string }[];
  usage?: { type?: string; seconds?: number };
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

    const file = openAiUploadFile(input.filename, input.mimeType);
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.audio)], { type: file.contentType }),
      file.filename,
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
      throw await openAiError('Serviço de transcrição', response);
    }

    const data = (await response.json()) as TranscriptionResponse;
    return {
      text: data.text.trim(),
      language: data.language ?? data.languages?.[0]?.code ?? null,
      durationSeconds: data.duration ?? billedSeconds(data) ?? null,
    };
  }
}

function billedSeconds(data: TranscriptionResponse): number | undefined {
  return data.usage?.type === 'duration' ? data.usage.seconds : undefined;
}
