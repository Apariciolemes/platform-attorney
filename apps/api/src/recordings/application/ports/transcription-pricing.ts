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

/** Port: preço por minuto do serviço de transcrição em uso. */
export abstract class TranscriptionPricing {
  abstract current(): TranscriptionPrice;
}
