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
  anneeId: zUuid.optional(),
  etat: zEtatVersion.default('initial'),
  snapshotId: zUuid.nullish(),
  sourceVersionId: zUuid.optional(),
});

/** Identifiant de version dans l’URL. */
export const zVersionParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des versions. */
export const zVersionList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['etat', 'createdAt', 'updatedAt']).shape)
  .extend({
    etat: zEtatVersion.optional(),
    semestreId: zUuid.optional(),
  });

/** Action de transition autorisée par la matrice workflow (18 transitions arbitrées). */
export const zActionTransition = z.enum([
  'creerRepartition',
  'annulerRepartition',
  'validerRepartition',
  'lancerGeneration',
  'editer',
  'selectionnerScenario',
  'annulerGeneration',
  'soumettreValidation',
  'regenerer',
  'transmettreDirection',
  'rejeterPedagogique',
  'validerDefinitivement',
  'rejeterDirectionPedagogique',
  'rejeterDirectionPlanning',
  'publier',
  'archiverSansPublier',
  'archiver',
  'nouvelleVersionArchive',
]);

export type ActionTransition = z.infer<typeof zActionTransition>;

/** Type de motif de rejet, obligatoire pour les actions de rejet. */
export const zTypeMotif = z.enum(['pedagogique', 'planning', 'autre']);

export type TypeMotif = z.infer<typeof zTypeMotif>;

/** Transition d’état demandée. */
export const zTransition = z
  .object({
    action: zActionTransition,
    motif: z.string().trim().optional(),
    typeMotif: zTypeMotif.optional(),
  })
  .refine(
    (valeurs) => {
      const estRejet =
        valeurs.action === 'rejeterPedagogique' ||
        valeurs.action === 'rejeterDirectionPedagogique' ||
        valeurs.action === 'rejeterDirectionPlanning';
      return !estRejet || (valeurs.motif && valeurs.motif.length > 0);
    },
    {
      message: 'Un motif est obligatoire pour une action de rejet',
      path: ['motif'],
    },
  )
  .refine(
    (valeurs) => {
      const estRejet =
        valeurs.action === 'rejeterPedagogique' ||
        valeurs.action === 'rejeterDirectionPedagogique' ||
        valeurs.action === 'rejeterDirectionPlanning';
      return !estRejet || valeurs.typeMotif !== undefined;
    },
    {
      message: 'Un type de motif est obligatoire pour une action de rejet',
      path: ['typeMotif'],
    },
  );

export type TransitionInput = z.infer<typeof zTransition>;

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
export type VersionParams = z.infer<typeof zVersionParams>;
export type VersionListFilters = z.infer<typeof zVersionList>;
export type GenerationInput = z.infer<typeof zGeneration>;
export type Scenario = z.infer<typeof zScenario>;
export type ScenarioSelectInput = z.infer<typeof zScenarioSelect>;
export type ExportInput = z.infer<typeof zExport>;
export type AuditFilters = z.infer<typeof zAudit>;
