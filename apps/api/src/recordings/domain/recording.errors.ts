import {
  ConflictError,
  NotFoundError,
} from '../../shared/domain/domain-error.js';

export class RecordingNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Gravação ${id} não encontrada`);
  }
}

export class RecordingNotRetryableError extends ConflictError {
  constructor(id: string, status: string) {
    super(`Gravação ${id} está ${status} e não pode ser reprocessada`);
  }
}

export class CorrectionNotAllowedError extends ConflictError {
  constructor(id: string, reason: string) {
    super(`Não é possível revisar a gravação ${id}: ${reason}`);
  }
}
