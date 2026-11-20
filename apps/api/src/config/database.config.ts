import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

/**
 * Opções do TypeORM compartilhadas entre a aplicação Nest e a CLI de migrations.
 */
export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const root = join(import.meta.dirname, '..');
  // .ts em dev/testes (vitest), .js no build — evita carregar arquivos .d.ts do dist.
  const ext = import.meta.filename.endsWith('.ts') ? 'ts' : 'js';

  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'platform_attorney',
    entities: [join(root, `**/*.entity.${ext}`)],
    migrations: [join(root, `database/migrations/*.${ext}`)],
    synchronize: env.DB_SYNCHRONIZE === 'true',
    migrationsRun: env.DB_MIGRATIONS_RUN !== 'false',
    logging: env.DB_LOGGING === 'true',
  };
}
