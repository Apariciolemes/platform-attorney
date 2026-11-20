import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StorageDisk } from '@nestjs/storage';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Repository } from 'typeorm';
import {
  TRANSCRIBE_JOB,
  TRANSCRIPTION_QUEUE,
  type TranscribeJobData,
} from '../config/queue.config.js';
import { Recording, RecordingStatus } from './entities/recording.entity.js';

/** O que o service precisa do arquivo recebido (subconjunto de Express.Multer.File). */
export interface UploadedAudio {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
    private readonly disk: StorageDisk,
    @InjectQueue(TRANSCRIPTION_QUEUE)
    private readonly transcriptionQueue: Queue<TranscribeJobData>,
  ) {}

  findAll(): Promise<Recording[]> {
    return this.recordingsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Recording> {
    const recording = await this.recordingsRepository.findOneBy({ id });
    if (!recording) {
      throw new NotFoundException(`Gravação ${id} não encontrada`);
    }
    return recording;
  }

  /** Envia o áudio ao storage, registra no banco e enfileira a transcrição. */
  async upload(file: UploadedAudio): Promise<Recording> {
    const id = randomUUID();
    const storageKey = `recordings/${id}${extname(file.originalname).toLowerCase()}`;

    await this.disk.put(storageKey, file.buffer, {
      contentType: file.mimetype,
      contentLength: file.size,
    });

    let recording: Recording;
    try {
      recording = await this.recordingsRepository.save(
        this.recordingsRepository.create({
          id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storageKey,
          status: RecordingStatus.Pending,
        }),
      );
    } catch (error) {
      // Sem registro no banco, o arquivo ficaria órfão no bucket.
      await this.disk.delete(storageKey).catch((deleteError: unknown) => {
        this.logger.error(
          `Falha ao remover ${storageKey} do storage`,
          deleteError,
        );
      });
      throw error;
    }

    await this.enqueueTranscription(recording.id);
    return recording;
  }

  /** Reenfileira uma gravação que falhou (ou ficou presa como pendente). */
  async retry(id: string): Promise<Recording> {
    const recording = await this.findOne(id);
    if (
      recording.status === RecordingStatus.Processing ||
      recording.status === RecordingStatus.Completed
    ) {
      throw new ConflictException(
        `Gravação ${id} está ${recording.status} e não pode ser reprocessada`,
      );
    }
    recording.status = RecordingStatus.Pending;
    recording.error = null;
    const saved = await this.recordingsRepository.save(recording);
    await this.enqueueTranscription(id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const recording = await this.findOne(id);
    await this.disk.delete(recording.storageKey);
    await this.recordingsRepository.remove(recording);
  }

  private async enqueueTranscription(recordingId: string): Promise<void> {
    await this.transcriptionQueue.add(
      TRANSCRIBE_JOB,
      { recordingId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
