import { ClientNotFoundError } from '../../domain/client.errors.js';
import type { ClientRepository } from '../ports/client.repository.js';

export class DeleteClientUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(id: string): Promise<void> {
    const client = await this.clients.findById(id);
    if (!client) throw new ClientNotFoundError(id);
    await this.clients.delete(client.id);
  }
}
