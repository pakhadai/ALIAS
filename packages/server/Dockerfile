# syntax=docker/dockerfile:1.6
# BuildKit cache for pnpm store speeds repeated builds (DOCKER_BUILDKIT=1, default in recent Docker).
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package sources
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

# Install dependencies (cached store)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# Generate Prisma client
RUN pnpm --filter @alias/server exec prisma generate

# Build shared and server
RUN pnpm --filter @alias/shared build
RUN pnpm --filter @alias/server build

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/server/prisma/ packages/server/prisma/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store

# Generate Prisma client in prod
RUN pnpm --filter @alias/server exec prisma generate

# Copy built files
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/server/dist/ packages/server/dist/

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
