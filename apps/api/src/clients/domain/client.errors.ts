import {
  ConflictError,
  NotFoundError,
} from '../../shared/domain/domain-error.js';

export class ClientNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Cliente ${id} não encontrado`);
  }
}

export class EmailAlreadyInUseError extends ConflictError {
  constructor(email: string) {
    super(`E-mail ${email} já cadastrado`);
  }
}
