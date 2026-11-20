import type { Client } from '../../domain/client.js';

/** Formato JSON exposto pela API (mantém o contrato usado pelo frontend). */
export function presentClient(client: Client) {
  return client.toSnapshot();
}
