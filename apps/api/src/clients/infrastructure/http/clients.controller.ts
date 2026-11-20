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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../shared/infrastructure/http/error-response.dto.js';
import { CreateClientUseCase } from '../../application/use-cases/create-client.use-case.js';
import { DeleteClientUseCase } from '../../application/use-cases/delete-client.use-case.js';
import { GetClientUseCase } from '../../application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from '../../application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '../../application/use-cases/update-client.use-case.js';
import { presentClient } from './client.presenter.js';
import { ClientResponseDto } from './dto/client-response.dto.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

const ClientIdParam = () =>
  ApiParam({ name: 'id', format: 'uuid', description: 'Id do cliente' });

/** Adapter de entrada HTTP: valida a requisição, chama o caso de uso e formata a resposta. */
@ApiTags('clients')
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
  @ApiOperation({
    summary: 'Lista os clientes, do mais recente ao mais antigo',
  })
  @ApiOkResponse({ type: [ClientResponseDto] })
  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.listClients.execute();
    return clients.map(presentClient);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um cliente' })
  @ClientIdParam()
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Id inválido' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    return presentClient(await this.getClient.execute(id));
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Dados inválidos',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'E-mail já cadastrado',
  })
  async create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return presentClient(await this.createClient.execute(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Altera dados de um cliente' })
  @ClientIdParam()
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Dados inválidos',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'E-mail já usado por outro cliente',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return presentClient(await this.updateClient.execute(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um cliente' })
  @ClientIdParam()
  @ApiNoContentResponse({ description: 'Cliente removido' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteClient.execute(id);
  }
}
