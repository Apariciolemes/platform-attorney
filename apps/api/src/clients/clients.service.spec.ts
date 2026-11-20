import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientsService } from './clients.service.js';
import { Client } from './entities/client.entity.js';

describe('ClientsService', () => {
  let service: ClientsService;
  const repo = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    existsBy: vi.fn(),
    create: vi.fn((dto: Partial<Client>) => dto),
    merge: vi.fn((entity: Client, dto: Partial<Client>) =>
      Object.assign(entity, dto),
    ),
    save: vi.fn((entity: Partial<Client>) =>
      Promise.resolve({ id: 'uuid', ...entity }),
    ),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(Client), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ClientsService);
  });

  it('cria um cliente quando o e-mail está livre', async () => {
    repo.existsBy.mockResolvedValue(false);
    const result = await service.create({
      name: 'Ana',
      email: 'ana@example.com',
    });
    expect(result).toMatchObject({ id: 'uuid', name: 'Ana' });
  });

  it('recusa e-mail duplicado', async () => {
    repo.existsBy.mockResolvedValue(true);
    await expect(
      service.create({ name: 'Ana', email: 'ana@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lança 404 quando o cliente não existe', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
