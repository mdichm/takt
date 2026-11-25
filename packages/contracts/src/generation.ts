// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zDateIso, zPaginationMeta } from './common';
import { zSolverPlacement } from './solver';

/** Statut d'un job de génération CP-SAT. */
export const zGenerationStatut = z.enum(['EN_COURS', 'TERMINEE', 'ECHEC', 'ANNULEE']);

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

/** Placement d'activité tel qu'il est stocké dans `Scenario.placements` (DB).
 *  Forme du solveur (`zSolverPlacement`) avec nbCreneaux en option
 *  (dérivé de l'affectation si absent). Validé par Zod à la lecture (GG-05). */
export const zPlacementPersistee = zSolverPlacement.extend({
  nbCreneaux: z.number().int().min(1).optional(),
});
export type PlacementPersistee = z.infer<typeof zPlacementPersistee>;

/** Réponse de l'adoption d'un scénario (POST /generations/:id/select). */
export const zScenarioSelectReponse = z.object({
  versionId: zUuid,
  scenarioId: zUuid,
  nbSeances: z.number().int().nonnegative(),
  nbActivitesNonPlacees: z.number().int().nonnegative(),
  couverture: z.number().int().min(0).max(100),
  conflitsResiduels: z.array(
    z.object({
      type: z.string(),
      seanceId: zUuid.nullable(),
      description: z.string(),
    }),
  ),
  avertissements: z.array(z.string()),
});
export type ScenarioSelectReponse = z.infer<typeof zScenarioSelectReponse>;

/** ------------------------------------------------------------------ */
/** Contrats préconditions de génération (TAKT-L07-07).               */
/** ------------------------------------------------------------------ */

/** Code d'une violation de précondition (bloquante). */
export const zPreconditionViolationCode = z.enum([
  'ETAT_VERSION_INVALIDE',
  'DEPARTEMENT_NON_VALIDE',
  'VERROU_INCOMPATIBLE',
  'COUVERTURE_NON_CONFORME',
]);

/** Violation de précondition retournée par checkGenerationPreconditions. */
export const zPreconditionViolation = z.object({
  code: zPreconditionViolationCode,
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type PreconditionViolationCode = z.infer<typeof zPreconditionViolationCode>;
export type PreconditionViolation = z.infer<typeof zPreconditionViolation>;

/** Code d'un avertissement de précondition (non bloquant par défaut). */
export const zPreconditionAvertissementCode = z.enum(['TAUX_VERROUILLAGE_ELEVE']);

/** Avertissement de précondition retourné par checkGenerationPreconditions. */
export const zPreconditionAvertissement = z.object({
  code: zPreconditionAvertissementCode,
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  bloquant: z.boolean().default(true),
});

export type PreconditionAvertissementCode = z.infer<typeof zPreconditionAvertissementCode>;
export type PreconditionAvertissement = z.infer<typeof zPreconditionAvertissement>;

/** Résultat structuré de checkGenerationPreconditions(versionId). */
export const zResultatPreconditions = z.object({
  satisfaites: z.boolean(),
  violations: z.array(zPreconditionViolation),
  avertissements: z.array(zPreconditionAvertissement),
});

export type ResultatPreconditions = z.infer<typeof zResultatPreconditions>;

/** Paramètres de l'endpoint de préconditions (versionId en query). */
export const zPreconditionsParams = z.object({
  versionId: zUuid,
});

export type PreconditionsParams = z.infer<typeof zPreconditionsParams>;
