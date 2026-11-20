import { Client, type ClientData } from '../../domain/client.js';
import { EmailAlreadyInUseError } from '../../domain/client.errors.js';
import type { ClientRepository } from '../ports/client.repository.js';

export class CreateClientUseCase {
  constructor(private readonly clients: ClientRepository) {}

  async execute(data: ClientData): Promise<Client> {
    if (await this.clients.existsByEmail(data.email)) {
      throw new EmailAlreadyInUseError(data.email);
    }
    const client = Client.create(data);
    await this.clients.save(client);
    return client;
  }
}
