# Stage 1: Build Vite
FROM node:24-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web ./apps/web

RUN npm ci
RUN npm run build -w apps/web

# Stage 2: Caddy Web Server
FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
