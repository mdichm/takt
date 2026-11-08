// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zBooleanQuery, zPaginationQuery, zUuid } from './common';

/** Données de création ou de modification d’une séance. */
export const zSeance = z.object({
  versionId: zUuid,
  jour: z
    .number()
    .int()
    .min(1, 'Le jour doit être compris entre 1 et 6')
    .max(6, 'Le jour doit être compris entre 1 et 6'),
  creneauDebut: z.number().int().nonnegative('Le créneau de début doit être positif ou nul'),
  nbCreneaux: z.number().int().positive('Le nombre de créneaux doit être supérieur à 0'),
  salleId: zUuid.nullish(),
  enseignantId: zUuid.nullish(),
  groupeId: zUuid.nullish(),
  activiteId: zUuid.nullish(),
});

/** Filtres de la liste des séances. */
export const zSeanceList = zPaginationQuery
  .extend(creerSchemaTri(['jour', 'creneauDebut', 'createdAt']).shape)
  .extend({
    versionId: zUuid.optional(),
    jour: z.coerce.number().int().min(1).max(6).optional(),
    salleId: zUuid.optional(),
    enseignantId: zUuid.optional(),
    groupeId: zUuid.optional(),
    estVerrouillee: zBooleanQuery.optional(),
  });

/** Pose d’un verrou sur une séance. */
export const zLock = z.object({
  seanceId: zUuid,
  type: z.enum(['CRENEAU', 'SALLE', 'ENSEIGNANT', 'ACTIVITE']),
});

/** Lot de séances soumis à la règle d’unicité d’une salle. */
export const zSeancesBatch = z
  .object({ seances: z.array(zSeance) })
  .superRefine((lot, contexte) => {
    const couples = new Set<string>();
    for (const seance of lot.seances) {
      if (seance.salleId === undefined || seance.salleId === null) {
        continue;
      }
      const couple = `${seance.jour}:${seance.creneauDebut}:${seance.salleId}`;
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

export type SeanceInput = z.infer<typeof zSeance>;
export type SeanceListFilters = z.infer<typeof zSeanceList>;
export type LockInput = z.infer<typeof zLock>;
export type SeancesBatch = z.infer<typeof zSeancesBatch>;
