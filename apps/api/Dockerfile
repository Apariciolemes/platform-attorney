# syntax=docker/dockerfile:1
# Build context: raiz do monorepo (docker compose já define isso).
FROM node:22-alpine AS base
RUN npm install -g pnpm@12.8.1
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/

# ---- dev: hot reload com o código montado via volume ----
FROM base AS dev
RUN pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["pnpm", "dev"]

# ---- build ----
FROM base AS build
RUN pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
RUN pnpm --filter api build

# ---- produção ----
FROM base AS prod
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter api...
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
