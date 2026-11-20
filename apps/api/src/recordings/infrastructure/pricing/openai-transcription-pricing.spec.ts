import type { ConfigService } from '@nestjs/config';
import { OpenAiTranscriptionPricing } from './openai-transcription-pricing.js';

const pricing = (values: Record<string, string | undefined>) =>
  new OpenAiTranscriptionPricing({
    get: (key: string) => values[key],
  } as unknown as ConfigService);

describe('OpenAiTranscriptionPricing', () => {
  it('usa o preço oficial do whisper-1 por padrão e avisa do desligamento', () => {
    expect(pricing({}).current()).toEqual({
      provider: 'OpenAI',
      model: 'whisper-1',
      usdPerMinute: 0.006,
      sourceUrl: 'https://developers.openai.com/api/docs/pricing',
      checkedAt: '2026-11-20',
      shutdownDate: '2027-02-26',
      replacementModel: 'gpt-transcribe',
      replacementUsdPerMinute: 0.0045,
    });
  });

  it('usa o preço do modelo configurado', () => {
    const price = pricing({ STT_MODEL: 'gpt-transcribe' }).current();
    expect(price.usdPerMinute).toBe(0.0045);
    expect(price.shutdownDate).toBeNull();
  });

  it('não supõe preço para outro provedor sem STT_PRICE_PER_MINUTE_USD', () => {
    const price = pricing({
      STT_BASE_URL: 'https://api.groq.com/openai/v1',
      STT_MODEL: 'whisper-large-v3',
    }).current();
    expect(price).toMatchObject({
      provider: 'api.groq.com',
      usdPerMinute: null,
    });
  });

  it('STT_PRICE_PER_MINUTE_USD sobrescreve o preço', () => {
    const price = pricing({
      STT_BASE_URL: 'https://api.groq.com/openai/v1',
      STT_PRICE_PER_MINUTE_USD: '0.00185',
    }).current();
    expect(price.usdPerMinute).toBe(0.00185);
    expect(price.sourceUrl).toBeNull();
  });

  it('ignora override inválido', () => {
    expect(
      pricing({ STT_PRICE_PER_MINUTE_USD: 'abc' }).current().usdPerMinute,
    ).toBe(0.006);
  });
});
