# Stage 1: Build source
FROM node:24-slim AS builder
WORKDIR /app

# Cài đặt OpenSSL cần cho Prisma engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy toàn bộ cấu hình monorepo
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/ai ./packages/ai
COPY apps/api ./apps/api

# Cài đặt dependencies toàn bộ workspace
RUN npm ci

# 1. Build package AI trước
RUN npm run build -w packages/ai

# 2. Sinh Prisma Client và build NestJS
RUN npm run db:generate -w apps/api
RUN npm run build -w apps/api

# Stage 2: Production Runner siêu nhẹ
FROM node:24-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

USER node

# Copy node_modules và build output
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/ai ./packages/ai
COPY --chown=node:node --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 3000

# Chạy migrate DB trước rồi khởi chạy server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
