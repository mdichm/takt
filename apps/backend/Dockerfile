# ============================================================================
# TAKT — Backend Dockerfile
# Fichier : apps/backend/Dockerfile
# Étape : G2 — Stratégie CI/CD
# ============================================================================

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy package files and shared configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/solver-client/package.json ./packages/solver-client/
COPY packages/charge-engine/package.json ./packages/charge-engine/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @takt/backend...

# Copy source code
COPY packages/contracts ./packages/contracts
COPY packages/contracts/tsconfig*.json ./packages/contracts/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/src ./packages/db/src
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/db/tsconfig*.json ./packages/db/
COPY packages/solver-client ./packages/solver-client
COPY packages/solver-client/tsconfig*.json ./packages/solver-client/
COPY packages/charge-engine ./packages/charge-engine
COPY packages/charge-engine/tsconfig*.json ./packages/charge-engine/
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig*.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/

# Generate Prisma Client (the URL is only parsed by the Prisma 7 CLI)
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @takt/db db:generate

# Build workspace dependencies and backend
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    pnpm turbo run build --env-mode=loose --filter=@takt/backend...

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app/apps/backend

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy built application and workspace dependencies
COPY --from=builder --chown=nestjs:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/dist /app/packages/db/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/node_modules /app/packages/db/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/package.json /app/packages/db/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/prisma /app/packages/db/prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/prisma.config.ts /app/packages/db/prisma.config.ts
COPY --from=builder --chown=nestjs:nodejs /app/packages/contracts/dist /app/packages/contracts/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/contracts/node_modules /app/packages/contracts/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/contracts/package.json /app/packages/contracts/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/solver-client/dist /app/packages/solver-client/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/solver-client/node_modules /app/packages/solver-client/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/solver-client/package.json /app/packages/solver-client/package.json

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]