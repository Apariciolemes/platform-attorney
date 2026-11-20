import type { Client } from '../../domain/client.js';
import { ClientNotFoundError } from '../../domain/client.errors.js';
import type { ClientRepository } from '../ports/client.repository.js';

export class GetClientUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(id: string): Promise<Client> {
    const client = await this.clients.findById(id);
    if (!client) throw new ClientNotFoundError(id);
    return client;
  }
}
