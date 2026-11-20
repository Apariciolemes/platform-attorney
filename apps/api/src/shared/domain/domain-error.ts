/**
 * Erros de regra de negócio. O domínio e a aplicação lançam estes erros sem conhecer HTTP;
 * a camada de infraestrutura (DomainErrorFilter) os traduz para o status adequado.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** O recurso pedido não existe (HTTP 404). */
export abstract class NotFoundError extends DomainError {}

/** A operação conflita com o estado atual (HTTP 409). */
export abstract class ConflictError extends DomainError {}
