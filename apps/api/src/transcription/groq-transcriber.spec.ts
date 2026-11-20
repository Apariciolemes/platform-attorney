import type { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import { GroqTranscriber } from './groq-transcriber.js';

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const input = {
  audio: Buffer.from('audio'),
  filename: 'r1.mp3',
  mimeType: 'audio/mpeg',
};

describe('GroqTranscriber', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia o áudio e devolve o texto', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        text: ' olá mundo ',
        language: 'portuguese',
        duration: 3,
      }),
    );
    const transcriber = new GroqTranscriber(
      config({ GROQ_API_KEY: 'key', TRANSCRIPTION_LANGUAGE: 'pt' }),
    );

    const result = await transcriber.transcribe(input);

    expect(result).toEqual({
      text: 'olá mundo',
      language: 'portuguese',
      durationSeconds: 3,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.headers).toEqual({ Authorization: 'Bearer key' });
    const form = init.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3');
    expect(form.get('language')).toBe('pt');
    expect((form.get('file') as File).name).toBe('r1.mp3');
  });

  it('falha sem retry quando não há chave', async () => {
    const transcriber = new GroqTranscriber(config({}));
    await expect(transcriber.transcribe(input)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('erro 4xx é irrecuperável', async () => {
    fetchMock.mockResolvedValue(new Response('invalid file', { status: 400 }));
    const transcriber = new GroqTranscriber(config({ GROQ_API_KEY: 'key' }));
    await expect(transcriber.transcribe(input)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('429 e 5xx permitem retry', async () => {
    fetchMock.mockResolvedValue(new Response('slow down', { status: 429 }));
    const transcriber = new GroqTranscriber(config({ GROQ_API_KEY: 'key' }));
    const error = await transcriber.transcribe(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnrecoverableError);
  });
});
