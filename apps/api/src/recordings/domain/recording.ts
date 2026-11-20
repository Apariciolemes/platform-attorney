import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { RecordingNotRetryableError } from './recording.errors.js';

export enum RecordingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export interface RecordingProps {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: RecordingStatus;
  transcript: string | null;
  language: string | null;
  durationSeconds: number | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewRecording {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Transcript {
  text: string;
  language: string | null;
  durationSeconds: number | null;
}

/**
 * Gravação de áudio e o ciclo de vida da sua transcrição:
 * pending → processing → completed, com idas a pending (nova tentativa) ou failed.
 */
export class Recording {
  private constructor(private props: RecordingProps) {}

  static create(data: NewRecording, now = new Date()): Recording {
    const id = randomUUID();
    return new Recording({
      id,
      ...data,
      storageKey: `recordings/${id}${extname(data.originalName).toLowerCase()}`,
      status: RecordingStatus.Pending,
      transcript: null,
      language: null,
      durationSeconds: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstrói uma gravação já persistida (usado pelos adapters de persistência). */
  static restore(props: RecordingProps): Recording {
    return new Recording({ ...props });
  }

  get id() {
    return this.props.id;
  }

  get storageKey() {
    return this.props.storageKey;
  }

  get mimeType() {
    return this.props.mimeType;
  }

  get originalName() {
    return this.props.originalName;
  }

  get status() {
    return this.props.status;
  }

  startProcessing(now = new Date()): void {
    this.change({ status: RecordingStatus.Processing, error: null }, now);
  }

  complete(transcript: Transcript, now = new Date()): void {
    this.change(
      {
        status: RecordingStatus.Completed,
        transcript: transcript.text,
        language: transcript.language,
        durationSeconds: transcript.durationSeconds,
        error: null,
      },
      now,
    );
  }

  /** Volta para a fila se ainda haverá nova tentativa; senão, falha de vez. */
  registerFailure(message: string, willRetry: boolean, now = new Date()): void {
    this.change(
      {
        status: willRetry ? RecordingStatus.Pending : RecordingStatus.Failed,
        error: message,
      },
      now,
    );
  }

  /** Pedido manual de reprocessamento: só para gravações que não estão em andamento nem concluídas. */
  requestRetry(now = new Date()): void {
    if (
      this.props.status === RecordingStatus.Processing ||
      this.props.status === RecordingStatus.Completed
    ) {
      throw new RecordingNotRetryableError(this.props.id, this.props.status);
    }
    this.change({ status: RecordingStatus.Pending, error: null }, now);
  }

  toSnapshot(): Readonly<RecordingProps> {
    return { ...this.props };
  }

  private change(changes: Partial<RecordingProps>, now: Date): void {
    this.props = { ...this.props, ...changes, updatedAt: now };
  }
}
