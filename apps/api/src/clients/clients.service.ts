import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { Client } from './entities/client.entity.js';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  findAll(): Promise<Client[]> {
    return this.clientsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} não encontrado`);
    }
    return client;
  }

  async create(dto: CreateClientDto): Promise<Client> {
    await this.ensureEmailIsFree(dto.email);
    return this.clientsRepository.save(this.clientsRepository.create(dto));
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    if (dto.email && dto.email !== client.email) {
      await this.ensureEmailIsFree(dto.email);
    }
    return this.clientsRepository.save(
      this.clientsRepository.merge(client, dto),
    );
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientsRepository.remove(client);
  }

  private async ensureEmailIsFree(email: string): Promise<void> {
    if (await this.clientsRepository.existsBy({ email })) {
      throw new ConflictException(`E-mail ${email} já cadastrado`);
    }
  }
}
