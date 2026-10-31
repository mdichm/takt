# ============================================================================
# TAKT — Backend Dockerfile
# Fichier : apps/backend/Dockerfile
# Étape : G2 — Stratégie CI/CD
#
# Contexte de build : racine du monorepo (`docker build -f apps/backend/Dockerfile .`)
# Les dépendances sont installées en mode « hoisted » afin d'obtenir une
# arborescence node_modules plate, compatible avec la copie multi-stage.
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

# Install dependencies (workspace complet : les CLI de build — prisma, tsc —
# sont des devDependencies de leurs packages et ne sont pas installés par un
# install filtré). Linker « hoisted » pour une arborescence node_modules plate.
RUN pnpm install --frozen-lockfile --config.node-linker=hoisted

# Copy source code
COPY packages/contracts ./packages/contracts
COPY packages/db ./packages/db
COPY packages/design-tokens ./packages/design-tokens
COPY packages/solver-client ./packages/solver-client
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

# Generate Prisma Client
RUN pnpm --filter @takt/db db:generate

# Build workspace packages puis le backend
RUN pnpm --filter @takt/contracts build
RUN pnpm --filter @takt/design-tokens build
RUN pnpm --filter @takt/solver-client build
RUN pnpm --filter @takt/db build
RUN pnpm --filter @takt/backend build

# Production stage
FROM node:24-slim AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Manifestes de tous les workspaces (recréent les liens symboliques de production)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/solver-client/package.json ./packages/solver-client/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile --prod --config.node-linker=hoisted

# Copy built application and workspace artifacts
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/design-tokens/dist ./packages/design-tokens/dist
COPY --from=builder /app/packages/solver-client/dist ./packages/solver-client/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Utilisateur non-root (l'image node:24-slim fournit déjà l'utilisateur `node`, uid 1000)
RUN chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]