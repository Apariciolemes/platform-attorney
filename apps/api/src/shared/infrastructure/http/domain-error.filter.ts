import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictError,
  DomainError,
  NotFoundError,
} from '../../domain/domain-error.js';

/** Traduz erros de domínio para respostas HTTP no mesmo formato das exceções do Nest. */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const [statusCode, label] = this.statusFor(error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ message: error.message, error: label, statusCode });
  }

  private statusFor(error: DomainError): [number, string] {
    if (error instanceof NotFoundError) {
      return [HttpStatus.NOT_FOUND, 'Not Found'];
    }
    if (error instanceof ConflictError) {
      return [HttpStatus.CONFLICT, 'Conflict'];
    }
    return [HttpStatus.UNPROCESSABLE_ENTITY, 'Unprocessable Entity'];
  }
}
