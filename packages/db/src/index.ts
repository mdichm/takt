// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

/** Types du client Prisma généré. */
export * from './generated/prisma/client';

/** Crée un client Prisma configuré avec le pilote PostgreSQL. */
export function creerPrismaClient(connectionString: string): PrismaClient {
  const adaptateur = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter: adaptateur });
}
