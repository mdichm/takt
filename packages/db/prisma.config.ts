// ============================================================================
// TAKT — Configuration Prisma 7
// Fichier : packages/db/prisma.config.ts
//
// Les chemins sont relatifs au répertoire du package (@takt/db) car ce fichier
// se trouve à la racine du package (emplacement attendu par Prisma 7).
// ============================================================================

import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Chemin du schéma Prisma
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://takt:takt@localhost:5432/takt_dev',
  },
});
