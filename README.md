# Platform Attorney

Monorepo (pnpm workspaces) com:

| Pasta       | Stack                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| `apps/api`  | NestJS 12 (ESM) + TypeORM + PostgreSQL, validação com class-validator  |
| `apps/web`  | Vue 3 + TypeScript + Composition API (`<script setup>`), Vite, Vue Router, Axios |

## Subir tudo com Docker

```bash
cp .env.example .env        # opcional, todos os valores têm default
docker compose up -d --build
```

| Serviço  | URL                               |
| -------- | --------------------------------- |
| Frontend | http://localhost:8080             |
| API      | http://localhost:3000/api         |
| Health   | http://localhost:3000/api/health  |
| Postgres | `localhost:5432` (postgres/postgres) |

O frontend (nginx) faz proxy de `/api` para o serviço `api`. A API roda as migrations automaticamente ao iniciar e só sobe depois que o banco está saudável.

### Modo desenvolvimento no Docker (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Frontend em http://localhost:5173 (Vite/HMR), API com `nest start --watch`.

## Desenvolvimento local (sem Docker para os apps)

```bash
pnpm install
docker compose up -d db     # só o banco
pnpm dev                    # API (3000) + Web (5173) em paralelo
```

## Scripts úteis

```bash
pnpm build                  # build de todos os apps
pnpm test                   # testes unitários da API (Vitest)
pnpm lint

# Migrations (TypeORM) — dentro de apps/api
pnpm --filter api migration:generate src/database/migrations/NomeDaMigration
pnpm --filter api migration:create src/database/migrations/NomeDaMigration
pnpm --filter api migration:run
pnpm --filter api migration:revert
```

## Estrutura

```
apps/
  api/src/
    config/database.config.ts   # opções do TypeORM (app + CLI)
    database/data-source.ts     # DataSource usado pela CLI de migrations
    database/migrations/
    clients/                    # módulo de exemplo (CRUD completo)
  web/src/
    services/                   # cliente HTTP (axios)
    composables/useClients.ts   # estado + ações via Composition API
    views/ClientsView.vue
    router/
docker-compose.yml              # db + api + web
docker-compose.dev.yml          # override de desenvolvimento
```
