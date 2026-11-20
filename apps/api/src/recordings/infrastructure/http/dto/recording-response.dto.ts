import { ApiProperty } from '@nestjs/swagger';
import { RecordingStatus } from '../../../domain/recording.js';

export class RecordingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'reuniao-cliente.m4a' })
  originalName: string;

  @ApiProperty({ example: 'audio/mp4' })
  mimeType: string;

  @ApiProperty({ example: 482133, description: 'Tamanho em bytes.' })
  sizeBytes: number;

  @ApiProperty({
    example: 'recordings/7f0c2b8e-1a4d-4c6f-9e3b-2d5a8c1f0e47.m4a',
    description: 'Chave do arquivo no storage S3.',
  })
  storageKey: string;

  @ApiProperty({
    enum: RecordingStatus,
    enumName: 'RecordingStatus',
    description:
      'pending: na fila · processing: transcrevendo · completed: transcrito · failed: falhou (veja `error`).',
  })
  status: RecordingStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Texto transcrito; preenchido quando status = completed.',
  })
  transcript: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'portuguese' })
  language: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 63.4 })
  durationSeconds: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Motivo da última falha de transcrição.',
  })
  error: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
