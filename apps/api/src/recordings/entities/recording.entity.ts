import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RecordingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

@Entity('recordings')
export class Recording {
  @PrimaryGeneratedColumn('uuid')
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
    default: RecordingStatus.Pending,
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
