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

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @takt/backend...

# Copy source code
COPY packages/db/prisma ./packages/db/prisma
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig*.json ./apps/backend/

# Generate Prisma Client
RUN pnpm --filter @takt/db prisma generate

# Build backend
RUN pnpm --filter @takt/backend build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/prisma ./prisma

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]