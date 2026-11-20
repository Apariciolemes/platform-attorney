import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/**
 * Documentação OpenAPI da API HTTP.
 * UI em /api/docs e JSON em /api/docs-json (também acessíveis pelo nginx do frontend).
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Platform Attorney API')
    .setDescription(
      'Cadastro de clientes e transcrição de gravações de áudio. ' +
        'Gravações são transcritas em segundo plano por um worker; ' +
        'consulte o status em GET /api/recordings/{id}.',
    )
    .setVersion('1.0')
    .addTag('clients', 'Cadastro de clientes')
    .addTag('recordings', 'Upload, streaming e transcrição de áudios')
    .addTag('health', 'Verificação de saúde')
    .build();

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      jsonDocumentUrl: `${SWAGGER_PATH}-json`,
      customSiteTitle: 'Platform Attorney API',
    },
  );
}
