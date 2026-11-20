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
