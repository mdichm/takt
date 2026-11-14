// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zBooleanQuery, zPaginationQuery, zUuid } from './common';

/** Identifiant UUID avec un message d’erreur personnalisé. */
function zUuidPersonnalise(message: string) {
  return z.string().uuid(message);
}

/** Données de création d’une séance (POST /api/v1/seances). */
export const zSeanceCreate = z.object({
  versionId: zUuid,
  jour: z
    .number()
    .int()
    .min(1, 'Le jour doit être compris entre 1 et 6')
    .max(6, 'Le jour doit être compris entre 1 et 6'),
  creneauDebutId: zUuidPersonnalise("L'identifiant du créneau de début est requis"),
  nbCreneaux: z.number().int().positive('Le nombre de créneaux doit être supérieur à 0'),
  salleId: zUuid.nullish(),
  enseignantId: zUuid.nullish(),
  groupeId: zUuid.nullish(),
  matiereId: zUuid.nullish(),
  typeEnseignementId: zUuid.nullish(),
  affectationId: zUuidPersonnalise("L'identifiant de l'affectation pédagogique est requis"),
});

/** Données de modification partielle d’une séance (PATCH /api/v1/seances/:id). */
export const zSeanceUpdate = z.object({
  versionId: zUuid.optional(),
  jour: z
    .number()
    .int()
    .min(1, 'Le jour doit être compris entre 1 et 6')
    .max(6, 'Le jour doit être compris entre 1 et 6')
    .optional(),
  creneauDebutId: zUuidPersonnalise("L'identifiant du créneau de début est requis").optional(),
  nbCreneaux: z
    .number()
    .int()
    .positive('Le nombre de créneaux doit être supérieur à 0')
    .optional(),
  salleId: zUuid.nullish().optional(),
  enseignantId: zUuid.nullish().optional(),
  groupeId: zUuid.nullish().optional(),
  matiereId: zUuid.nullish().optional(),
  typeEnseignementId: zUuid.nullish().optional(),
  affectationId: zUuidPersonnalise("L'identifiant de l'affectation pédagogique est requis").optional(),
});

/** Données de remplacement complet d’une séance (PUT /api/v1/seances/:id). */
export const zSeanceReplace = zSeanceCreate;

/** Identifiant d’une séance en paramètre de route. */
export const zSeanceParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des séances. */
export const zSeanceList = zPaginationQuery
  .extend(creerSchemaTri(['jour', 'createdAt']).shape)
  .extend({
    versionId: zUuid.optional(),
    jour: z.coerce.number().int().min(1).max(6).optional(),
    salleId: zUuid.optional(),
    enseignantId: zUuid.optional(),
    groupeId: zUuid.optional(),
    matiereId: zUuid.optional(),
    typeEnseignementId: zUuid.optional(),
    affectationId: zUuid.optional(),
    estVerrouillee: zBooleanQuery.optional(),
  });

/** Pose d’un verrou sur une séance. */
export const zLock = z.object({
  seanceId: zUuid,
  type: z.enum(['CRENEAU', 'SALLE', 'ENSEIGNANT', 'ACTIVITE']),
});

/** Lot de séances soumis à la règle d’unicité d’une salle. */
export const zSeancesBatch = z
  .object({ seances: z.array(zSeanceCreate) })
  .superRefine((lot, contexte) => {
    const couples = new Set<string>();
    for (const seance of lot.seances) {
      if (seance.salleId === undefined || seance.salleId === null) {
        continue;
      }
      const couple = `${seance.jour}:${seance.creneauDebutId}:${seance.salleId}`;
      if (couples.has(couple)) {
        contexte.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Deux séances ne peuvent pas partager le même jour, le même créneau et la même salle',
          path: ['seances'],
        });
        return;
      }
      couples.add(couple);
    }
  });

export type SeanceCreateInput = z.infer<typeof zSeanceCreate>;
export type SeanceUpdateInput = z.infer<typeof zSeanceUpdate>;
export type SeanceReplaceInput = z.infer<typeof zSeanceReplace>;
export type SeanceParams = z.infer<typeof zSeanceParams>;
export type SeanceListFilters = z.infer<typeof zSeanceList>;
export type LockInput = z.infer<typeof zLock>;
export type SeancesBatch = z.infer<typeof zSeancesBatch>;
