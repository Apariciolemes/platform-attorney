import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateClientUseCase } from '../../application/use-cases/create-client.use-case.js';
import { DeleteClientUseCase } from '../../application/use-cases/delete-client.use-case.js';
import { GetClientUseCase } from '../../application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from '../../application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '../../application/use-cases/update-client.use-case.js';
import { presentClient } from './client.presenter.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

/** Adapter de entrada HTTP: valida a requisição, chama o caso de uso e formata a resposta. */
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly getClient: GetClientUseCase,
    private readonly createClient: CreateClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly deleteClient: DeleteClientUseCase,
  ) {}

  @Get()
  async findAll() {
    const clients = await this.listClients.execute();
    return clients.map(presentClient);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return presentClient(await this.getClient.execute(id));
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    return presentClient(await this.createClient.execute(dto));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return presentClient(await this.updateClient.execute(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteClient.execute(id);
  }
}
