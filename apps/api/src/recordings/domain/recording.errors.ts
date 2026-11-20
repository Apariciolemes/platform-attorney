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
