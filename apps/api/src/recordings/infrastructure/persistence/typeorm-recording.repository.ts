import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordingRepository } from '../../application/ports/recording.repository.js';
import { Recording } from '../../domain/recording.js';
import { RecordingOrmEntity } from './recording.orm.entity.js';

/** Adapter: implementa o port RecordingRepository com TypeORM/Postgres. */
@Injectable()
export class TypeOrmRecordingRepository extends RecordingRepository {
  constructor(
    @InjectRepository(RecordingOrmEntity)
    private readonly orm: Repository<RecordingOrmEntity>,
  ) {
    super();
  }

  async findAll(): Promise<Recording[]> {
    const rows = await this.orm.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => Recording.restore(row));
  }

  async findById(id: string): Promise<Recording | null> {
    const row = await this.orm.findOneBy({ id });
    return row ? Recording.restore(row) : null;
  }

  async save(recording: Recording): Promise<void> {
    await this.orm.save(this.orm.create(recording.toSnapshot()));
  }

  async delete(id: string): Promise<void> {
    await this.orm.delete({ id });
  }
}
