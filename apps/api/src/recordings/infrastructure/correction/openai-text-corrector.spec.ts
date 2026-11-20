import type { ConfigService } from '@nestjs/config';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { CORRECTION_INSTRUCTIONS } from './correction-prompt.js';
import {
  maxOutputTokensFor,
  OpenAiTextCorrector,
} from './openai-text-corrector.js';

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

/** Formato real observado na Responses API (sem o atalho output_text no topo). */
const responsesApiBody = (text: string) => ({
  status: 'completed',
  incomplete_details: null,
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text }],
    },
  ],
  usage: { input_tokens: 1613, output_tokens: 958 },
});

describe('OpenAiTextCorrector', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia o texto à Responses API e devolve a revisão com o uso de tokens', async () => {
    fetchMock.mockResolvedValue(
      Response.json(responsesApiBody('  Foi descontada alguma falta?  ')),
    );
    const corrector = new OpenAiTextCorrector(config({ STT_API_KEY: 'key' }));

    const result = await corrector.correct('foi descontado alguma falta tua');

    expect(result).toEqual({
      text: 'Foi descontada alguma falta?',
      model: 'gpt-6-luna',
      inputTokens: 1613,
      outputTokens: 958,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer key' });
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-6-luna',
      instructions: CORRECTION_INSTRUCTIONS,
      input: 'foi descontado alguma falta tua',
      reasoning: { effort: 'none' },
      store: false,
    });
  });

  it('usa CORRECTION_API_KEY e CORRECTION_MODEL quando definidos', async () => {
    fetchMock.mockResolvedValue(Response.json(responsesApiBody('ok')));
    const corrector = new OpenAiTextCorrector(
      config({
        STT_API_KEY: 'stt',
        CORRECTION_API_KEY: 'revisao',
        CORRECTION_MODEL: 'gpt-5.6-luna',
      }),
    );

    const result = await corrector.correct('texto');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer revisao' });
    expect(result.model).toBe('gpt-5.6-luna');
  });

  it('resposta cortada por limite de tokens falha sem retry', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
        output: [],
      }),
    );
    const corrector = new OpenAiTextCorrector(config({ STT_API_KEY: 'key' }));

    await expect(corrector.correct('texto')).rejects.toThrow(
      NonRetryableTranscriptionError,
    );
  });

  it('recusa do modelo vira erro sem retry com o motivo', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'refusal', refusal: 'não posso ajudar' }],
          },
        ],
      }),
    );
    const corrector = new OpenAiTextCorrector(config({ STT_API_KEY: 'key' }));

    await expect(corrector.correct('texto')).rejects.toThrow(
      'O modelo recusou a revisão: não posso ajudar',
    );
  });

  it('falta de créditos falha sem retry', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: {
            message: 'You have no credits remaining.',
            type: 'insufficient_quota',
          },
        },
        { status: 429 },
      ),
    );
    const corrector = new OpenAiTextCorrector(config({ STT_API_KEY: 'key' }));

    await expect(corrector.correct('texto')).rejects.toThrow(
      'Serviço de revisão respondeu 429: You have no credits remaining.',
    );
  });

  it('sem chave falha sem chamar a API', async () => {
    const corrector = new OpenAiTextCorrector(config({}));

    await expect(corrector.correct('texto')).rejects.toBeInstanceOf(
      NonRetryableTranscriptionError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dimensiona o limite de saída pelo tamanho do texto', () => {
    expect(maxOutputTokensFor('curto')).toBe(2_000);
    expect(maxOutputTokensFor('a'.repeat(30_000))).toBe(20_000);
    expect(maxOutputTokensFor('a'.repeat(1_000_000))).toBe(128_000);
  });
});
