FROM oven/bun:1 AS base

WORKDIR /app

# Copy root and workspace package files
COPY package.json bun.lock turbo.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.cjs ./apps/web/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile

# Copy source and build shared package
COPY packages/shared/src ./packages/shared/src
RUN bun run --cwd packages/shared build

# Copy API source and generate Prisma client
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src ./apps/api/src
RUN bun run --cwd apps/api db:generate

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "bun prisma migrate deploy && bun prisma db seed && bun src/index.ts"]
