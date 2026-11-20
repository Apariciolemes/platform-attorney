export interface TranscriptionPrice {
  /** Ex.: "OpenAI", ou o host do serviço compatível. */
  provider: string;
  model: string;
  /** Null quando o preço do modelo/provedor não é conhecido nem foi configurado. */
  usdPerMinute: number | null;
  /** Onde o preço foi conferido. */
  sourceUrl: string | null;
  /** Data (AAAA-MM-DD) em que o preço foi conferido na fonte. */
  checkedAt: string | null;
  /** Data (AAAA-MM-DD) em que o provedor vai desligar o modelo, se anunciada. */
  shutdownDate: string | null;
  /** Modelo indicado pelo provedor como substituto. */
  replacementModel: string | null;
  replacementUsdPerMinute: number | null;
}

/** Preço de um modelo de texto, cobrado por token (US$ por 1 milhão de tokens). */
export interface TokenPrice {
  model: string;
  usdPerMillionInputTokens: number;
  usdPerMillionOutputTokens: number;
}

/** Port: preços do processamento das gravações (transcrição por minuto, revisão por token). */
export abstract class TranscriptionPricing {
  abstract current(): TranscriptionPrice;
  /** Modelo de revisão configurado e seu preço; preço null se desconhecido. */
  abstract currentCorrection(): { model: string; price: TokenPrice | null };
  /** Preço de um modelo de revisão específico (o que revisou cada gravação). */
  abstract correctionPrice(model: string): TokenPrice | null;
}
