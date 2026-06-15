# syntax=docker/dockerfile:1.6
# Build stage — must run from monorepo root context
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Pre-build: client `build` runs scripts/sync-logo.mjs (needs logo/ assets + sharp from root devDeps)
COPY scripts/sync-logo.mjs scripts/
COPY logo/ logo/

# Copy only packages needed for client build
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/

# Install all workspace deps (cached store)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# Build-time env vars injected by docker-compose build args
ARG VITE_SERVER_URL=http://localhost:3001
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_TG_APP_LINK=
ARG VITE_PUBLIC_APP_URL=
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_TG_APP_LINK=$VITE_TG_APP_LINK
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL

# Build shared first, then client
RUN pnpm --filter @movli/shared build
RUN pnpm --filter @movli/client build

# Production stage — nginx serving static files
FROM nginx:1.27-alpine

COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
