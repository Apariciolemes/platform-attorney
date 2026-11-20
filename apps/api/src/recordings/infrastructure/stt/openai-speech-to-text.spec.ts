import type { ConfigService } from '@nestjs/config';
import { NonRetryableTranscriptionError } from '../../application/ports/speech-to-text.js';
import { OpenAiSpeechToText } from './openai-speech-to-text.js';

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const input = {
  audio: Buffer.from('audio'),
  filename: 'r1.mp3',
  mimeType: 'audio/mpeg',
};

describe('OpenAiSpeechToText', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia o áudio para a OpenAI por padrão e devolve o texto', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        text: ' olá mundo ',
        language: 'portuguese',
        duration: 3,
      }),
    );
    const transcriber = new OpenAiSpeechToText(
      config({ STT_API_KEY: 'key', TRANSCRIPTION_LANGUAGE: 'pt' }),
    );

    const result = await transcriber.transcribe(input);

    expect(result).toEqual({
      text: 'olá mundo',
      language: 'portuguese',
      durationSeconds: 3,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(init.headers).toEqual({ Authorization: 'Bearer key' });
    const form = init.body as FormData;
    expect(form.get('model')).toBe('whisper-1');
    expect(form.get('response_format')).toBe('verbose_json');
    expect(form.get('language')).toBe('pt');
    expect((form.get('file') as File).name).toBe('r1.mp3');
  });

  it('usa STT_BASE_URL e json para modelos que não são Whisper', async () => {
    fetchMock.mockResolvedValue(Response.json({ text: 'oi' }));
    const transcriber = new OpenAiSpeechToText(
      config({
        STT_API_KEY: 'key',
        STT_BASE_URL: 'https://api.groq.com/openai/v1/',
        STT_MODEL: 'gpt-4o-mini-transcribe',
      }),
    );

    const result = await transcriber.transcribe(input);

    expect(result).toEqual({
      text: 'oi',
      language: null,
      durationSeconds: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect((init.body as FormData).get('response_format')).toBe('json');
  });

  it('falha sem retry quando não há chave', async () => {
    const transcriber = new OpenAiSpeechToText(config({}));
    await expect(transcriber.transcribe(input)).rejects.toBeInstanceOf(
      NonRetryableTranscriptionError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('erro 4xx é irrecuperável', async () => {
    fetchMock.mockResolvedValue(new Response('invalid file', { status: 400 }));
    const transcriber = new OpenAiSpeechToText(config({ STT_API_KEY: 'key' }));
    await expect(transcriber.transcribe(input)).rejects.toBeInstanceOf(
      NonRetryableTranscriptionError,
    );
  });

  it('429 e 5xx permitem retry', async () => {
    fetchMock.mockResolvedValue(new Response('slow down', { status: 429 }));
    const transcriber = new OpenAiSpeechToText(config({ STT_API_KEY: 'key' }));
    const error = await transcriber.transcribe(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(NonRetryableTranscriptionError);
  });

  it('429 por falta de créditos não tem retry e mostra só a mensagem', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: {
            message: 'You have no credits remaining.',
            type: 'insufficient_quota',
            code: 'credit_balance_exhausted',
          },
        },
        { status: 429 },
      ),
    );
    const transcriber = new OpenAiSpeechToText(config({ STT_API_KEY: 'key' }));

    const error = await transcriber.transcribe(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NonRetryableTranscriptionError);
    expect((error as Error).message).toBe(
      'Serviço de transcrição respondeu 429: You have no credits remaining.',
    );
  });
});
