import type { Client, ClientData } from '../../domain/client.js';
import {
  ClientNotFoundError,
  EmailAlreadyInUseError,
} from '../../domain/client.errors.js';
import type { ClientRepository } from '../ports/client.repository.js';

export class UpdateClientUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(id: string, changes: Partial<ClientData>): Promise<Client> {
    const client = await this.clients.findById(id);
    if (!client) throw new ClientNotFoundError(id);

    const emailChanged = changes.email && changes.email !== client.email;
    if (emailChanged && (await this.clients.existsByEmail(changes.email!))) {
      throw new EmailAlreadyInUseError(changes.email!);
    }

    client.update(changes);
    await this.clients.save(client);
    return client;
  }
}
