FROM oven/bun:1 AS base

WORKDIR /app

# Copy root and workspace package files
COPY package.json bun.lock turbo.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.cjs ./apps/web/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile

# Copy source and build shared package
COPY packages/shared/src ./packages/shared/src
RUN bun run --cwd packages/shared build

# Copy web source and build
COPY apps/web/app ./apps/web/app
COPY apps/web/public ./apps/web/public
RUN bun run --cwd apps/web build

WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "start"]
