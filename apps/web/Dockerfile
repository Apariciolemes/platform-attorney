# syntax=docker/dockerfile:1
# Build context: raiz do monorepo (docker compose já define isso).
FROM node:22-alpine AS base
RUN npm install -g pnpm@12.8.1
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
WORKDIR /repo/apps/web

# ---- dev: Vite com HMR ----
FROM base AS dev
EXPOSE 5173
CMD ["pnpm", "dev"]

# ---- build ----
FROM base AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# ---- produção: nginx servindo o SPA e fazendo proxy de /api ----
FROM nginx:1.27-alpine AS prod
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
