import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  CorrectionNotAllowedError,
  RecordingNotRetryableError,
} from './recording.errors.js';

export enum RecordingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

/** Revisão do texto por IA, que acontece depois de a transcrição ficar pronta. */
export enum CorrectionStatus {
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
  /** Null enquanto não houver transcrição ou se a revisão estiver desligada. */
  correctionStatus: CorrectionStatus | null;
  correctedTranscript: string | null;
  correctionError: string | null;
  correctionModel: string | null;
  correctionInputTokens: number | null;
  correctionOutputTokens: number | null;
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

export interface Correction {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Gravação de áudio e seus dois ciclos de processamento:
 * - transcrição: pending → processing → completed, com idas a pending (nova tentativa) ou failed;
 * - revisão do texto (depois da transcrição): pending → processing → completed ou failed.
 * Se a revisão falhar, a transcrição original continua valendo.
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
      correctionStatus: null,
      correctedTranscript: null,
      correctionError: null,
      correctionModel: null,
      correctionInputTokens: null,
      correctionOutputTokens: null,
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

  get transcript() {
    return this.props.transcript;
  }

  get correctionStatus() {
    return this.props.correctionStatus;
  }

  startProcessing(now = new Date()): void {
    this.change({ status: RecordingStatus.Processing, error: null }, now);
  }

  /**
   * Guarda a transcrição. Com `withCorrection`, a revisão fica pendente
   * (e qualquer revisão anterior é descartada, pois o texto mudou).
   */
  complete(transcript: Transcript, withCorrection: boolean, now = new Date()) {
    this.change(
      {
        status: RecordingStatus.Completed,
        transcript: transcript.text,
        language: transcript.language,
        durationSeconds: transcript.durationSeconds,
        error: null,
        ...this.resetCorrection(
          withCorrection ? CorrectionStatus.Pending : null,
        ),
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

  /** Pedido manual de (nova) revisão do texto: exige transcrição pronta e nenhuma revisão em andamento. */
  requestCorrection(now = new Date()): void {
    if (this.props.status !== RecordingStatus.Completed) {
      throw new CorrectionNotAllowedError(
        this.props.id,
        'a transcrição ainda não está pronta',
      );
    }
    if (this.props.correctionStatus === CorrectionStatus.Processing) {
      throw new CorrectionNotAllowedError(
        this.props.id,
        'a revisão já está em andamento',
      );
    }
    this.change(this.resetCorrection(CorrectionStatus.Pending), now);
  }

  startCorrection(now = new Date()): void {
    this.change(
      { correctionStatus: CorrectionStatus.Processing, correctionError: null },
      now,
    );
  }

  completeCorrection(correction: Correction, now = new Date()): void {
    this.change(
      {
        correctionStatus: CorrectionStatus.Completed,
        correctedTranscript: correction.text,
        correctionError: null,
        correctionModel: correction.model,
        correctionInputTokens: correction.inputTokens,
        correctionOutputTokens: correction.outputTokens,
      },
      now,
    );
  }

  /** Volta para a fila se ainda haverá nova tentativa; senão, a revisão falha (o original continua valendo). */
  registerCorrectionFailure(
    message: string,
    willRetry: boolean,
    now = new Date(),
  ): void {
    this.change(
      {
        correctionStatus: willRetry
          ? CorrectionStatus.Pending
          : CorrectionStatus.Failed,
        correctionError: message,
      },
      now,
    );
  }

  toSnapshot(): Readonly<RecordingProps> {
    return { ...this.props };
  }

  private resetCorrection(
    status: CorrectionStatus | null,
  ): Partial<RecordingProps> {
    return {
      correctionStatus: status,
      correctedTranscript: null,
      correctionError: null,
      correctionModel: null,
      correctionInputTokens: null,
      correctionOutputTokens: null,
    };
  }

  private change(changes: Partial<RecordingProps>, now: Date): void {
    this.props = { ...this.props, ...changes, updatedAt: now };
  }
}
