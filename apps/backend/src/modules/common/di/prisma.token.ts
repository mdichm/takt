// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Jeton d'injection du service Prisma, remplaçable par un double en test.
 *
 * Permet aux modules métier d'accéder à Prisma sans importer directement
 * le sous-module `common/prisma` (règle d'architecture des modules,
 * `check-module-dependencies`).
 */
export const PRISMA = Symbol('PRISMA');