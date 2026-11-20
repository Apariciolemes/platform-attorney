import { Recording } from '../../domain/recording.js';
import type { AudioStorage } from '../ports/audio-storage.js';
import type { RecordingRepository } from '../ports/recording.repository.js';
import type { TranscriptionQueue } from '../ports/transcription-queue.js';

export interface UploadRecordingInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
}

/** Guarda o áudio, registra a gravação como pendente e agenda a transcrição. */
export class UploadRecordingUseCase {
  constructor(
    private readonly recordings: RecordingRepository,
    private readonly storage: AudioStorage,
    private readonly queue: TranscriptionQueue,
  ) {}

  async execute(input: UploadRecordingInput): Promise<Recording> {
    const recording = Recording.create({
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.storage.upload(
      recording.storageKey,
      input.content,
      input.mimeType,
    );
    try {
      await this.recordings.save(recording);
    } catch (error) {
      // Sem registro no banco, o arquivo ficaria órfão no storage.
      await this.storage.delete(recording.storageKey).catch(() => undefined);
      throw error;
    }

    await this.queue.enqueue(recording.id);
    return recording;
  }
}
