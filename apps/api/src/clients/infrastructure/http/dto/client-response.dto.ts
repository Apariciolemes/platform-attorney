import { ApiProperty } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria Helena Duarte' })
  name: string;

  @ApiProperty({ format: 'email', example: 'maria.duarte@example.com' })
  email: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '123.456.789-09',
    description: 'CPF ou CNPJ.',
  })
  document: string | null;

  @ApiProperty({ type: String, nullable: true, example: '(11) 98765-4321' })
  phone: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
