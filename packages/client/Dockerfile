# Build stage — must run from monorepo root context
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy only packages needed for client build
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Build-time env vars injected by docker-compose build args
ARG VITE_SERVER_URL=http://localhost:3001
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build shared first, then client
RUN pnpm --filter @alias/shared build
RUN pnpm --filter @alias/client build

# Production stage — nginx serving static files
FROM nginx:1.27-alpine

COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
