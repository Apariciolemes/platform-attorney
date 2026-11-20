import { ApiProperty } from '@nestjs/swagger';
import { RecordingStatus } from '../../../domain/recording.js';

export class TranscriptionPriceDto {
  @ApiProperty({ example: 'OpenAI' })
  provider: string;

  @ApiProperty({ example: 'whisper-1' })
  model: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.006,
    description:
      'US$ por minuto de áudio. Null se o preço não é conhecido (defina STT_PRICE_PER_MINUTE_USD).',
  })
  usdPerMinute: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://developers.openai.com/api/docs/pricing',
  })
  sourceUrl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date',
    example: '2026-11-20',
    description: 'Quando o preço foi conferido na fonte.',
  })
  checkedAt: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date',
    example: '2027-02-26',
    description: 'Data anunciada para o provedor desligar o modelo.',
  })
  shutdownDate: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'gpt-transcribe' })
  replacementModel: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.0045 })
  replacementUsdPerMinute: number | null;
}

export class RecordingCostDto {
  @ApiProperty({ format: 'uuid' })
  recordingId: string;

  @ApiProperty({ example: 'reuniao-cliente.m4a' })
  originalName: string;

  @ApiProperty({ enum: RecordingStatus, enumName: 'RecordingStatus' })
  status: RecordingStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: Number, nullable: true, example: 63.4 })
  durationSeconds: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 0.00634,
    description:
      'Custo estimado em US$. Null se a gravação não foi transcrita ou o preço é desconhecido.',
  })
  costUsd: number | null;
}

export class TranscriptionCostTotalsDto {
  @ApiProperty({ example: 12 })
  transcribedRecordings: number;

  @ApiProperty({ example: 1834.5 })
  transcribedSeconds: number;

  @ApiProperty({ type: Number, nullable: true, example: 0.18345 })
  costUsd: number | null;
}

export class TranscriptionCostsResponseDto {
  @ApiProperty({ type: TranscriptionPriceDto })
  pricing: TranscriptionPriceDto;

  @ApiProperty({ type: [RecordingCostDto] })
  recordings: RecordingCostDto[];

  @ApiProperty({ type: TranscriptionCostTotalsDto })
  totals: TranscriptionCostTotalsDto;
}
