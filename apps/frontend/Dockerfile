# ============================================================================
# TAKT — Frontend Dockerfile
# Fichier : apps/frontend/Dockerfile
# Étape : G2 — Stratégie CI/CD
#
# Contexte de build : racine du monorepo (`docker build -f apps/frontend/Dockerfile .`)
# ============================================================================

# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Install pnpm (version alignée sur le champ `packageManager` du package.json racine)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files — manifestes de tous les workspaces du monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/solver-client/package.json ./packages/solver-client/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies (workspace complet : les CLI de build sont des
# devDependencies de leurs packages). Linker « hoisted » pour une arborescence
# node_modules plate.
RUN pnpm install --frozen-lockfile --config.node-linker=hoisted

# Copy source code
COPY packages/contracts ./packages/contracts
COPY packages/db ./packages/db
COPY packages/design-tokens ./packages/design-tokens
COPY packages/solver-client ./packages/solver-client
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

# Build workspace packages puis le frontend
RUN pnpm --filter @takt/contracts build
RUN pnpm --filter @takt/design-tokens build
RUN pnpm --filter @takt/frontend build

# Production stage — Nginx
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Healthcheck (127.0.0.1 : nginx n'ecoute qu'en IPv4, « localhost » peut
# resoudre vers [::1] et echouer)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]