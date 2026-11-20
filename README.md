# Platform Attorney

Monorepo (pnpm workspaces) com:

| Pasta       | Stack                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| `apps/api`  | NestJS 12 (ESM) + TypeORM + PostgreSQL, validação com class-validator             |
| `apps/web`  | Vue 3 + TypeScript + Composition API (`<script setup>`), Vite, Vue Router, Axios |

A API também tem um **worker** (mesmo código, outro processo) que transcreve áudios com Whisper.

## Arquitetura de upload e transcrição

```
web ──POST /api/recordings──▶ api ──put──▶ storage S3 (SeaweedFS local | Cloudflare R2 | AWS S3)
                               │  grava no Postgres (status = pending)
                               └─ enfileira job ──▶ Redis (BullMQ)
                                                        │
worker ◀────────────────────────────────────────────────┘
  baixa o áudio do storage → Groq Whisper → salva a transcrição no Postgres (completed | failed)
```

- Storage via [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) (`S3Disk`): o mesmo código fala com qualquer storage compatível com S3. Trocar de provedor é só mudar as variáveis `STORAGE_*`.
- Fila via [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues): 3 tentativas com backoff exponencial. Erros que não melhoram com retry (chave inválida, arquivo inválido) falham na hora.
- Upload limitado a **25 MB**, o limite de arquivo do plano gratuito da Groq.

## Subir tudo com Docker

```bash
cp .env.example .env        # preencha GROQ_API_KEY (veja abaixo)
docker compose up -d --build
```

| Serviço       | URL / porta                                           |
| ------------- | ----------------------------------------------------- |
| Frontend      | http://localhost:8080 (página **Gravações**)          |
| API           | http://localhost:3000/api                             |
| Health        | http://localhost:3000/api/health                      |
| Postgres      | `localhost:5432` (postgres/postgres)                  |
| Storage S3    | `http://localhost:8333` (devaccesskey/devsecretkey)   |
| Redis         | `localhost:6379`                                      |

Por padrão, o storage é o **SeaweedFS local**: um servidor compatível com S3 rodando no próprio docker-compose. Os arquivos ficam no volume `storagedata`, no seu PC, sem conta nem custo. O serviço `storage-init` cria o bucket na primeira subida.

### Testar pela linha de comando

```bash
curl -F file=@minha-gravacao.m4a http://localhost:3000/api/recordings   # → status "pending"
curl http://localhost:3000/api/recordings/<id>                           # até status "completed"
```

### Endpoints

| Método | Rota                          | Descrição                                     |
| ------ | ----------------------------- | --------------------------------------------- |
| POST   | `/api/recordings`             | Upload (multipart, campo `file`, só áudio)    |
| GET    | `/api/recordings`             | Lista gravações com status e transcrição      |
| GET    | `/api/recordings/:id`         | Detalhe de uma gravação                       |
| GET    | `/api/recordings/:id/audio`   | Streaming do áudio (suporta Range)            |
| POST   | `/api/recordings/:id/retry`   | Reenfileira uma gravação que falhou           |
| DELETE | `/api/recordings/:id`         | Apaga o arquivo do storage e o registro       |

## Chave da Groq (transcrição)

1. Crie uma conta em https://console.groq.com (o plano gratuito basta).
2. Vá em **API Keys** → **Create API Key** e copie a chave.
3. No `.env`: `GROQ_API_KEY=gsk_...`.
4. Opcional: `GROQ_STT_MODEL=whisper-large-v3-turbo` é mais rápido; `whisper-large-v3` (padrão) é mais preciso. `TRANSCRIPTION_LANGUAGE=pt` fixa o idioma.

Sem a chave, as gravações ficam com status `failed` e a mensagem `GROQ_API_KEY não configurada`. Depois de configurar, use "Tentar de novo".

## Usar o Cloudflare R2 (storage na nuvem, 10 GB grátis)

1. Crie uma conta em https://dash.cloudflare.com. Ao ativar o R2, pode ser pedido um cartão só para verificação; o uso dentro do plano gratuito não é cobrado.
2. No menu, vá em **R2 Object Storage** → **Create bucket**. Dê um nome (ex.: `platform-attorney-recordings`) e mantenha a classe de armazenamento **Standard**: o plano gratuito não cobre Infrequent Access.
3. Na página do R2, abra **Manage API Tokens** → **Create API Token**:
   - Permissão: **Object Read & Write**
   - Escopo: **apenas o bucket criado**
4. Copie o **Access Key ID**, o **Secret Access Key** e o endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. O secret só aparece uma vez.
5. No `.env`:

   ```env
   STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_BUCKET=platform-attorney-recordings
   STORAGE_ACCESS_KEY_ID=<access key id>
   STORAGE_SECRET_ACCESS_KEY=<secret access key>
   STORAGE_FORCE_PATH_STYLE=false
   ```

6. Rode `docker compose up -d` de novo. A API e o worker passam a usar o R2; os serviços `storage` e `storage-init` continuam subindo, mas ficam sem uso.

Plano gratuito do R2: 10 GB armazenados por mês, 1 milhão de escritas e 10 milhões de leituras por mês, e download (egress) sempre grátis.

## Alternativa: AWS S3

1. Em https://console.aws.amazon.com/s3, clique em **Create bucket**. Escolha a região (ex.: `sa-east-1`) e mantenha **Block all public access** ligado.
2. Em **IAM** → **Users** → **Create user** (ex.: `platform-attorney-app`), sem acesso ao console.
3. Anexe uma política inline restrita ao bucket:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::SEU-BUCKET/*"
       }
     ]
   }
   ```

4. No usuário, abra **Security credentials** → **Create access key** (tipo "Application running outside AWS").
5. No `.env`: `STORAGE_ENDPOINT=https://s3.sa-east-1.amazonaws.com`, `STORAGE_REGION=sa-east-1`, `STORAGE_FORCE_PATH_STYLE=false`, e preencha o bucket e as chaves. Não deixe o endpoint vazio: vazio significa "storage local".

Contas novas da AWS recebem créditos gratuitos que expiram (o plano Free dura cerca de 6 meses). Depois disso o S3 passa a ser cobrado. Configure um alerta de orçamento em **Billing**.

### Modo desenvolvimento no Docker (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

O frontend fica em http://localhost:5173 (Vite/HMR). A API e o worker rodam com `nest start --watch`.

## Desenvolvimento local (sem Docker para os apps)

```bash
pnpm install
docker compose up -d db redis storage storage-init   # só a infraestrutura
pnpm dev                                             # API (3000) + worker + Web (5173)
```

## Scripts úteis

```bash
pnpm build                  # build de todos os apps
pnpm test                   # testes unitários da API (Vitest)
pnpm lint
pnpm dev:worker             # só o worker de transcrição

# Migrations (TypeORM), dentro de apps/api
pnpm --filter api migration:generate src/database/migrations/NomeDaMigration
pnpm --filter api migration:create src/database/migrations/NomeDaMigration
pnpm --filter api migration:run
pnpm --filter api migration:revert
```

## Estrutura

```
apps/
  api/src/
    config/                     # database, storage (S3) e fila (Redis)
    shared/infra.module.ts      # infra compartilhada pela API e pelo worker
    database/                   # DataSource da CLI + migrations
    clients/                    # módulo de exemplo (CRUD)
    recordings/                 # upload, listagem e streaming de áudios
    transcription/              # processor da fila + cliente Groq Whisper
    main.ts                     # entrypoint HTTP
    worker.ts                   # entrypoint do worker
  web/src/
    services/                   # cliente HTTP (axios)
    composables/                # useClients, useRecordings (com polling)
    views/                      # ClientsView, RecordingsView
infra/seaweedfs/s3.json         # credenciais do storage local (só dev)
docker-compose.yml              # db + storage + redis + api + worker + web
docker-compose.dev.yml          # override de desenvolvimento
```
