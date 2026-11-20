import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto.js';

/** Todos os campos opcionais; só os enviados são alterados. */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
