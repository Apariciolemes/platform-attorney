import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RecordingStatus } from '../../domain/recording.js';

/** Modelo de tabela do TypeORM. O domínio usa `Recording`; a conversão fica no repositório. */
@Entity('recordings')
export class RecordingOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ name: 'storage_key', length: 255, unique: true })
  storageKey: string;

  @Column({
    type: 'enum',
    enum: RecordingStatus,
    enumName: 'recordings_status_enum',
  })
  status: RecordingStatus;

  @Column({ type: 'text', nullable: true })
  transcript: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string | null;

  @Column({
    name: 'duration_seconds',
    type: 'double precision',
    nullable: true,
  })
  durationSeconds: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
