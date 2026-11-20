import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type TranscriptionPrice,
  TranscriptionPricing,
} from '../../application/ports/transcription-pricing.js';

const OPENAI_PRICING_URL = 'https://developers.openai.com/api/docs/pricing';
/** Data em que a tabela abaixo foi conferida na página oficial da OpenAI. */
const OPENAI_PRICES_CHECKED_AT = '2026-11-20';

interface ModelPrice {
  usdPerMinute: number;
  shutdownDate?: string;
  replacementModel?: string;
}

/**
 * Preços de transcrição da OpenAI (US$ por minuto de áudio), conforme a página oficial.
 * Datas de desligamento conforme https://developers.openai.com/api/docs/deprecations.
 */
const OPENAI_TRANSCRIPTION_PRICES: Record<string, ModelPrice> = {
  'whisper-1': {
    usdPerMinute: 0.006,
    shutdownDate: '2027-02-26',
    replacementModel: 'gpt-transcribe',
  },
  'gpt-4o-transcribe': {
    usdPerMinute: 0.006,
    shutdownDate: '2027-02-26',
    replacementModel: 'gpt-transcribe',
  },
  'gpt-4o-mini-transcribe': {
    usdPerMinute: 0.003,
    shutdownDate: '2027-02-26',
    replacementModel: 'gpt-transcribe',
  },
  'gpt-transcribe': { usdPerMinute: 0.0045 },
};

/**
 * Adapter: preço do serviço configurado em STT_BASE_URL/STT_MODEL.
 * Para a OpenAI usa a tabela oficial; para outros serviços (ou para corrigir um preço),
 * defina STT_PRICE_PER_MINUTE_USD.
 */
@Injectable()
export class OpenAiTranscriptionPricing extends TranscriptionPricing {
  constructor(private readonly config: ConfigService) {
    super();
  }

  current(): TranscriptionPrice {
    const model = this.config.get<string>('STT_MODEL') || 'whisper-1';
    const baseUrl =
      this.config.get<string>('STT_BASE_URL') || 'https://api.openai.com/v1';
    const host = new URL(baseUrl).host;
    const isOpenAi = host === 'api.openai.com';
    const known = isOpenAi ? OPENAI_TRANSCRIPTION_PRICES[model] : undefined;
    const override = this.parseOverride();
    const replacement = known?.replacementModel
      ? OPENAI_TRANSCRIPTION_PRICES[known.replacementModel]
      : undefined;

    return {
      provider: isOpenAi ? 'OpenAI' : host,
      model,
      usdPerMinute: override ?? known?.usdPerMinute ?? null,
      sourceUrl: override != null ? null : known ? OPENAI_PRICING_URL : null,
      checkedAt:
        override != null ? null : known ? OPENAI_PRICES_CHECKED_AT : null,
      shutdownDate: known?.shutdownDate ?? null,
      replacementModel: known?.replacementModel ?? null,
      replacementUsdPerMinute: replacement?.usdPerMinute ?? null,
    };
  }

  private parseOverride(): number | null {
    const raw = this.config.get<string>('STT_PRICE_PER_MINUTE_USD');
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
}
