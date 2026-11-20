import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientRepository } from './application/ports/client.repository.js';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case.js';
import { DeleteClientUseCase } from './application/use-cases/delete-client.use-case.js';
import { GetClientUseCase } from './application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case.js';
import { ClientsController } from './infrastructure/http/clients.controller.js';
import { ClientOrmEntity } from './infrastructure/persistence/client.orm.entity.js';
import { TypeOrmClientRepository } from './infrastructure/persistence/typeorm-client.repository.js';

/**
 * Composition root do contexto de clientes: liga cada port ao seu adapter.
 * Os casos de uso não dependem do Nest, então são criados por factory.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClientOrmEntity])],
  controllers: [ClientsController],
  providers: [
    { provide: ClientRepository, useClass: TypeOrmClientRepository },
    ...[
      ListClientsUseCase,
      GetClientUseCase,
      CreateClientUseCase,
      UpdateClientUseCase,
      DeleteClientUseCase,
    ].map((UseCase) => ({
      provide: UseCase,
      useFactory: (clients: ClientRepository) => new UseCase(clients),
      inject: [ClientRepository],
    })),
  ],
})
export class ClientsModule {}
