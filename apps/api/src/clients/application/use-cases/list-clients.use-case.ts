import type { Client } from '../../domain/client.js';
import type { ClientRepository } from '../ports/client.repository.js';

export class ListClientsUseCase {
  constructor(private readonly clients: ClientRepository) {}

  execute(): Promise<Client[]> {
    return this.clients.findAll();
  }
}
