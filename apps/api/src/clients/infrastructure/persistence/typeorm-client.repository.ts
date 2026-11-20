import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRepository } from '../../application/ports/client.repository.js';
import { Client } from '../../domain/client.js';
import { ClientOrmEntity } from './client.orm.entity.js';

/** Adapter: implementa o port ClientRepository com TypeORM/Postgres. */
@Injectable()
export class TypeOrmClientRepository extends ClientRepository {
  constructor(
    @InjectRepository(ClientOrmEntity)
    private readonly orm: Repository<ClientOrmEntity>,
  ) {
    super();
  }

  async findAll(): Promise<Client[]> {
    const rows = await this.orm.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => Client.restore(row));
  }

  async findById(id: string): Promise<Client | null> {
    const row = await this.orm.findOneBy({ id });
    return row ? Client.restore(row) : null;
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.orm.existsBy({ email });
  }

  async save(client: Client): Promise<void> {
    await this.orm.save(this.orm.create(client.toSnapshot()));
  }

  async delete(id: string): Promise<void> {
    await this.orm.delete({ id });
  }
}
