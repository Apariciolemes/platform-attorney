import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';

interface ErrorResponse {
  error?: { message?: string; type?: string; code?: string };
}

/** Extrai a mensagem e o tipo do erro no formato da OpenAI; senão usa o corpo cru. */
function parseErrorBody(body: string): { detail: string; code?: string } {
  try {
    const { error } = JSON.parse(body) as ErrorResponse;
    if (error?.message) {
      return { detail: error.message, code: error.type ?? error.code };
    }
  } catch {
    // Corpo não é JSON (ex.: proxy, HTML): usa o texto como veio.
  }
  return { detail: body.slice(0, 500) };
}

/**
 * Converte uma resposta de erro da API da OpenAI (ou compatível) num erro da aplicação:
 * 4xx (arquivo inválido, chave errada…) não melhora com retry; 408/429 e 5xx sim.
 * Exceção: a OpenAI também responde 429 quando a conta está sem créditos.
 */
export async function openAiError(
  service: string,
  response: Response,
): Promise<Error> {
  const { detail, code } = parseErrorBody(await response.text());
  const message = `${service} respondeu ${response.status}: ${detail}`;
  const retryable =
    code !== 'insufficient_quota' &&
    (response.status === 408 ||
      response.status === 429 ||
      response.status >= 500);
  return retryable
    ? new Error(message)
    : new NonRetryableTranscriptionError(message);
}
