# ============================================================================
# TAKT — Frontend Dockerfile
# Fichier : apps/frontend/Dockerfile
# Étape : G2 — Stratégie CI/CD
# ============================================================================

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @takt/frontend...

# Copy source code
COPY packages/design-tokens ./packages/design-tokens
COPY apps/frontend/src ./apps/frontend/src
COPY apps/frontend/public ./apps/frontend/public
COPY apps/frontend/index.html ./apps/frontend/
COPY apps/frontend/tsconfig*.json ./apps/frontend/
COPY apps/frontend/vite.config.ts ./apps/frontend/

# Build frontend
RUN pnpm --filter @takt/frontend build

# Production stage — Nginx
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]