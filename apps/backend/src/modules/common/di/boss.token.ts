// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Jeton d'injection du client pg-boss, remplaçable par un double en test.
 *
 * pg-boss est un module ESM ; ce token permet d'isoler son instanciation
 * asynchrone (dynamic import) du reste du backend CommonJS.
 */
export const PGBOSS = Symbol('PGBOSS');

/** Données d'un job de génération transmis à pg-boss. */
export interface GenerationJobData {
  generationId: string;
  versionId: string;
  demandeurId: string;
}