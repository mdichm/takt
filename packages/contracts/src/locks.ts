// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zPaginationQuery, zUuid } from './common';

/** Quatre types de verrous de séance (EX-VRR-01, HC-LOCK-01 à HC-LOCK-04). */
export const zTypeVerrou = z.enum(['CRENEAU', 'SALLE', 'ENSEIGNANT', 'ACTIVITE']);

/** Poids par défaut d'un verrou (100 % = position imposée). */
export const POIDS_VERROU_DEFAUT = 100;

/** Portée d'une pose en masse (groupe / enseignant / salle) ou pose individuelle. */
export const zPorteeVerrou = z.discriminatedUnion('cible', [
  z.object({ cible: z.literal('SEANCE'), seanceId: zUuid }),
  z.object({ cible: z.literal('GROUPE'), groupeId: zUuid }),
  z.object({ cible: z.literal('ENSEIGNANT'), enseignantId: zUuid }),
  z.object({ cible: z.literal('SALLE'), salleId: zUuid }),
]);

/**
 * Pose d'un verrou sur une séance (POST /api/v1/locks).
 *
 * - Pose individuelle : `seanceId` renseigné, `portee` absent.
 * - Pose en masse : `portee` renseignée (GROUPE / ENSEIGNANT / SALLE), `seanceId` absent.
 * Le service résout la portée vers la liste des séances de la version et crée un verrou
 * par séance en une transaction.
 */
export const zLockCreate = z
  .object({
    versionId: zUuid,
    type: zTypeVerrou,
    /** Identifiant de la ressource imposée (creneau / salle / enseignant / typeEnseignement). */
    valeur: zUuid,
    poids: z
      .number()
      .int()
      .positive("Le poids doit être supérieur à 0")
      .max(100, 'Le poids ne peut pas dépasser 100')
      .default(POIDS_VERROU_DEFAUT),
    /** Séance ciblée (pose individuelle). Mutuellement exclusif avec `portee`. */
    seanceId: zUuid.optional(),
    /** Portée de la pose en masse. Mutuellement exclusif avec `seanceId`. */
    portee: zPorteeVerrou.optional(),
  })
  .superRefine((data, contexte) => {
    const { seanceId, portee } = data;
    const aSeance = seanceId !== undefined;
    const aPortee = portee !== undefined;
    if (aSeance && aPortee) {
      contexte.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Indiquez soit 'seanceId' (pose individuelle) soit 'portee' (pose en masse), pas les deux.",
        path: ['portee'],
      });
    }
    if (!aSeance && !aPortee) {
      contexte.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Indiquez 'seanceId' (pose individuelle) ou 'portee' (pose en masse).",
        path: ['seanceId'],
      });
    }
  });

/** Identifiant d'un verrou en paramètre de route (DELETE /api/v1/locks/:id). */
export const zLockParams = z.object({
  id: zUuid,
});

/**
 * Représentation d'un verrou posé (réponse GET/POST /api/v1/locks et DELETE /api/v1/locks/:id).
 * `utilisateurId` est l'identifiant de l'utilisateur qui a posé le verrou (posePar).
 */
export const zLock = z.object({
  id: zUuid,
  versionId: zUuid,
  seanceId: zUuid,
  utilisateurId: zUuid,
  type: zTypeVerrou,
  valeur: zUuid,
  poids: z.number().int(),
  datePose: z.string().datetime(),
});

/** Filtres de la liste des verrous (GET /api/v1/locks). */
export const zLockList = zPaginationQuery
  .extend(creerSchemaTri(['datePose', 'type', 'seanceId']).shape)
  .extend({
    versionId: zUuid.optional(),
    seanceId: zUuid.optional(),
    type: zTypeVerrou.optional(),
    valeur: zUuid.optional(),
  });

/** Détail d'une incompatibilité verrou ↔ contrainte dure (409 WORKFLOW_INVALID_TRANSITION). */
export const zVerrouIncompatible = z.object({
  code: z.literal('VERROU_INCOMPATIBLE'),
  message: z.string(),
  details: z.object({
    seanceId: zUuid,
    verrouId: zUuid,
    verrouType: zTypeVerrou,
    valeurVerrou: zUuid,
    poids: z.number().int(),
  }),
});

/** Types TypeScript inférés des schémas Zod (partagés frontend/backend). */
export type TypeVerrou = z.infer<typeof zTypeVerrou>;
export type PorteeVerrou = z.infer<typeof zPorteeVerrou>;
export type LockCreateInput = z.infer<typeof zLockCreate>;
export type LockParams = z.infer<typeof zLockParams>;
export type Lock = z.infer<typeof zLock>;
export type LockListFilters = z.infer<typeof zLockList>;
export type VerrouIncompatible = z.infer<typeof zVerrouIncompatible>;
