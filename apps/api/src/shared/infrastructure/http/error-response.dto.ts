import { ApiProperty } from '@nestjs/swagger';

/** Formato dos erros da API (exceções do Nest e erros de domínio traduzidos). */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    description:
      'Mensagem do erro; em falhas de validação, uma lista de mensagens.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Cliente 7f0c… não encontrado',
  })
  message: string | string[];

  @ApiProperty({ example: 'Not Found' })
  error: string;
}
