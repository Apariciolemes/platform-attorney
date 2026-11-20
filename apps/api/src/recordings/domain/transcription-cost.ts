/**
 * Custo estimado de transcrever um áudio: proporcional à duração, ao preço por minuto do modelo.
 * Estimativa: a fatura real do provedor pode arredondar a duração de outra forma.
 */
export function estimateTranscriptionCost(
  durationSeconds: number,
  usdPerMinute: number,
): number {
  if (durationSeconds < 0 || usdPerMinute < 0) {
    throw new RangeError('Duração e preço não podem ser negativos');
  }
  return (durationSeconds / 60) * usdPerMinute;
}

/** Custo de uma chamada a um modelo de texto cobrado por token (preços por 1 milhão de tokens). */
export function estimateTokenCost(
  inputTokens: number,
  outputTokens: number,
  usdPerMillionInputTokens: number,
  usdPerMillionOutputTokens: number,
): number {
  if (
    inputTokens < 0 ||
    outputTokens < 0 ||
    usdPerMillionInputTokens < 0 ||
    usdPerMillionOutputTokens < 0
  ) {
    throw new RangeError('Tokens e preços não podem ser negativos');
  }
  return (
    (inputTokens * usdPerMillionInputTokens +
      outputTokens * usdPerMillionOutputTokens) /
    1_000_000
  );
}
