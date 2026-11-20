import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { TextCorrector } from '../../application/ports/text-corrector.js';
import type { Correction } from '../../domain/recording.js';
import { openAiError } from '../openai/openai-error.js';
import { CORRECTION_INSTRUCTIONS } from './correction-prompt.js';

export const DEFAULT_CORRECTION_MODEL = 'gpt-6-luna';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const REQUEST_TIMEOUT_MS = 180_000;
/** Limite de saída do gpt-6-luna. */
const MAX_OUTPUT_TOKENS_CAP = 128_000;

interface ResponsesApiResponse {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: {
    type: string;
    content?: { type: string; text?: string; refusal?: string }[];
  }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Adapter: implementa o port TextCorrector com a Responses API da OpenAI (POST /v1/responses).
 * Usa a chave CORRECTION_API_KEY ou, sem ela, a mesma da transcrição (STT_API_KEY).
 */
@Injectable()
export class OpenAiTextCorrector extends TextCorrector {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async correct(text: string): Promise<Correction> {
    const apiKey =
      this.config.get<string>('CORRECTION_API_KEY') ||
      this.config.get<string>('STT_API_KEY');
    if (!apiKey) {
      throw new NonRetryableTranscriptionError(
        'Chave da API não configurada para a revisão (CORRECTION_API_KEY ou STT_API_KEY)',
      );
    }
    const baseUrl = (
      this.config.get<string>('CORRECTION_BASE_URL') || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    const model =
      this.config.get<string>('CORRECTION_MODEL') || DEFAULT_CORRECTION_MODEL;

    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: CORRECTION_INSTRUCTIONS,
        input: text,
        // Revisão é tarefa direta: sem raciocínio, que só aumentaria custo e demora.
        reasoning: { effort: 'none' },
        max_output_tokens: maxOutputTokensFor(text),
        // Não guardar o conteúdo (conversas de clientes) no provedor.
        store: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw await openAiError('Serviço de revisão', response);
    }

    const data = (await response.json()) as ResponsesApiResponse;
    if (data.status === 'incomplete') {
      throw new NonRetryableTranscriptionError(
        `Revisão incompleta (${data.incomplete_details?.reason ?? 'motivo desconhecido'}). ` +
          'O texto pode ser longo demais para revisar de uma vez.',
      );
    }

    // A resposta não traz o atalho output_text: o texto fica em output[].content[].
    const content = data.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? []);
    const refusal = content?.find((c) => c.type === 'refusal')?.refusal;
    const corrected = content
      ?.filter((c) => c.type === 'output_text')
      .map((c) => c.text ?? '')
      .join('')
      .trim();

    if (!corrected) {
      throw new NonRetryableTranscriptionError(
        refusal
          ? `O modelo recusou a revisão: ${refusal}`
          : 'O serviço de revisão não devolveu texto.',
      );
    }

    return {
      text: corrected,
      model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }
}

/**
 * O texto revisado tem tamanho parecido com o original (~1 token a cada 3 caracteres
 * em português); a folga evita cortar a revisão no meio.
 */
export function maxOutputTokensFor(text: string): number {
  return Math.min(
    MAX_OUTPUT_TOKENS_CAP,
    Math.max(2_000, Math.ceil(text.length / 3) * 2),
  );
}
