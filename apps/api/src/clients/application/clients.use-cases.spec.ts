import { Client } from '../domain/client.js';
import {
  ClientNotFoundError,
  EmailAlreadyInUseError,
} from '../domain/client.errors.js';
import { ClientRepository } from './ports/client.repository.js';
import { CreateClientUseCase } from './use-cases/create-client.use-case.js';
import { DeleteClientUseCase } from './use-cases/delete-client.use-case.js';
import { GetClientUseCase } from './use-cases/get-client.use-case.js';
import { UpdateClientUseCase } from './use-cases/update-client.use-case.js';

/** Adapter em memória: os casos de uso são testados sem banco e sem Nest. */
class InMemoryClientRepository extends ClientRepository {
  readonly items = new Map<string, Client>();

  findAll() {
    return Promise.resolve([...this.items.values()]);
  }
  findById(id: string) {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  existsByEmail(email: string) {
    return Promise.resolve(
      [...this.items.values()].some((c) => c.email === email),
    );
  }
  save(client: Client) {
    this.items.set(client.id, client);
    return Promise.resolve();
  }
  delete(id: string) {
    this.items.delete(id);
    return Promise.resolve();
  }
}

describe('casos de uso de clientes', () => {
  let repo: InMemoryClientRepository;

  beforeEach(() => {
    repo = new InMemoryClientRepository();
  });

  it('cria um cliente quando o e-mail está livre', async () => {
    const client = await new CreateClientUseCase(repo).execute({
      name: 'Ana',
      email: 'ana@example.com',
    });

    expect(client.toSnapshot()).toMatchObject({
      name: 'Ana',
      email: 'ana@example.com',
      document: null,
      phone: null,
    });
    expect(repo.items.has(client.id)).toBe(true);
  });

  it('recusa e-mail duplicado', async () => {
    const create = new CreateClientUseCase(repo);
    await create.execute({ name: 'Ana', email: 'ana@example.com' });

    await expect(
      create.execute({ name: 'Outra', email: 'ana@example.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('lança ClientNotFoundError quando o cliente não existe', async () => {
    await expect(
      new GetClientUseCase(repo).execute('missing'),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it('atualiza dados e recusa trocar para e-mail de outro cliente', async () => {
    const create = new CreateClientUseCase(repo);
    const ana = await create.execute({ name: 'Ana', email: 'ana@example.com' });
    await create.execute({ name: 'Bia', email: 'bia@example.com' });
    const update = new UpdateClientUseCase(repo);

    const updated = await update.execute(ana.id, { phone: '11999' });
    expect(updated.toSnapshot().phone).toBe('11999');

    await expect(
      update.execute(ana.id, { email: 'bia@example.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('remove o cliente', async () => {
    const ana = await new CreateClientUseCase(repo).execute({
      name: 'Ana',
      email: 'ana@example.com',
    });

    await new DeleteClientUseCase(repo).execute(ana.id);

    expect(repo.items.size).toBe(0);
  });
});
