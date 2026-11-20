import type { Client } from '../../domain/client.js';

/** Port de persistência de clientes. A classe abstrata também serve de token de injeção. */
export abstract class ClientRepository {
  abstract findAll(): Promise<Client[]>;
  abstract findById(id: string): Promise<Client | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract save(client: Client): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
