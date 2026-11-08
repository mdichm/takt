// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import {
  creerSchemaTri,
  zDateIso,
  zEtatVersion,
  zPaginationQuery,
  zSearchFilter,
  zUuid,
} from './common';

/** Données de création d’une version de planning. */
export const zVersion = z.object({
  semestreId: zUuid,
  etat: zEtatVersion.default('initial'),
  snapshotId: zUuid.nullish(),
});

/** Filtres de la liste des versions. */
export const zVersionList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['etat', 'createdAt', 'updatedAt']).shape)
  .extend({
    etat: zEtatVersion.optional(),
  });

/** Transition d’état demandée. */
export const zTransition = z.object({
  transition: z.string().trim().min(1, 'La transition est requise'),
});

/** Lancement d’une génération CP-SAT. */
export const zGeneration = z.object({
  versionId: zUuid,
});

/** Scénario produit par le solveur. */
export const zScenario = z.object({
  id: zUuid,
  generationId: zUuid,
  scoreGlobal: z.number().int().min(0).max(100),
  sousScores: z.record(z.number().finite()),
  selectionne: z.boolean(),
  createdAt: zDateIso,
});

/** Sélection d’un scénario. */
export const zScenarioSelect = z.object({
  scenarioId: zUuid,
});

/** Lancement d’un export. */
export const zExport = z.object({
  versionId: zUuid,
  format: z.enum(['xlsx', 'pdf', 'ics']),
});

/** Filtres du journal d’audit. */
export const zAudit = z
  .object({
    page: z.coerce.number().int().positive('La page doit être supérieure à 0').default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive('La taille de page doit être supérieure à 0')
      .max(200, 'La taille de page ne peut pas dépasser 200')
      .default(20),
    action: z.string().trim().min(1).optional(),
    entite: z.string().trim().min(1).optional(),
    utilisateurId: zUuid.optional(),
    dateDebut: zDateIso.optional(),
    dateFin: zDateIso.optional(),
  })
  .refine(
    (valeurs) =>
      valeurs.dateDebut === undefined ||
      valeurs.dateFin === undefined ||
      new Date(valeurs.dateDebut) <= new Date(valeurs.dateFin),
    {
      message: 'La date de début doit être antérieure ou égale à la date de fin',
      path: ['dateFin'],
    },
  );

export type VersionInput = z.infer<typeof zVersion>;
export type VersionListFilters = z.infer<typeof zVersionList>;
export type TransitionInput = z.infer<typeof zTransition>;
export type GenerationInput = z.infer<typeof zGeneration>;
export type Scenario = z.infer<typeof zScenario>;
export type ScenarioSelectInput = z.infer<typeof zScenarioSelect>;
export type ExportInput = z.infer<typeof zExport>;
export type AuditFilters = z.infer<typeof zAudit>;
