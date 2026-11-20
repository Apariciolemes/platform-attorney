import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ maxLength: 150, example: 'Maria Helena Duarte' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    format: 'email',
    maxLength: 150,
    example: 'maria.duarte@example.com',
    description: 'Único entre os clientes.',
  })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({
    maxLength: 20,
    example: '123.456.789-09',
    description: 'CPF ou CNPJ.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ maxLength: 20, example: '(11) 98765-4321' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
