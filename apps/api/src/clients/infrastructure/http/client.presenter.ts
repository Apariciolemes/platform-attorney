import type { Client } from '../../domain/client.js';
import type { ClientResponseDto } from './dto/client-response.dto.js';

/** Formato JSON exposto pela API; o tipo garante que bate com o documentado no Swagger. */
export function presentClient(client: Client): ClientResponseDto {
  return client.toSnapshot();
}
