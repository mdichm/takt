// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zDateIso, zPaginationMeta } from './common';

/** Statut d'un job de génération CP-SAT. */
export const zGenerationStatut = z.enum(['EN_COURS', 'TERMINEE', 'ECHEC']);

/** Représentation d'une génération (job CP-SAT) en base. Conforme au schéma `Generation` de docs/openapi.yaml. */
export const zGenerationItem = z.object({
  id: zUuid,
  versionId: zUuid,
  statut: zGenerationStatut,
  snapshotId: zUuid.nullable(),
  fichierDerivesId: zUuid.nullable(),
  scores: z.record(z.unknown()).nullable(),
  dureeMs: z.number().int().nonnegative().nullable(),
  nombreScenarios: z.number().int().nonnegative(),
  createdAt: zDateIso,
});

/** Filtres de liste des générations. Conforme à docs/openapi.yaml (GET /generations). */
export const zGenerationListFilters = z.object({
  versionId: zUuid,
  statut: zGenerationStatut.optional(),
});

/** Réponse paginée des générations. */
export const zGenerationList = z.object({
  items: z.array(zGenerationItem),
  meta: zPaginationMeta,
});

/** Demande d'annulation d'une génération (corps vide, action implicite). */
export const zGenerationAnnuler = z.object({});

/** Sélection d'un scénario produit par le solver (POST /generations/:id/select). */
export const zScenarioSelectRequest = z.object({
  scenarioId: zUuid,
});

export type GenerationStatut = z.infer<typeof zGenerationStatut>;
export type GenerationItem = z.infer<typeof zGenerationItem>;
export type GenerationListFilters = z.infer<typeof zGenerationListFilters>;
export type GenerationList = z.infer<typeof zGenerationList>;
export type GenerationAnnulerInput = z.infer<typeof zGenerationAnnuler>;
export type ScenarioSelectRequest = z.infer<typeof zScenarioSelectRequest>;
