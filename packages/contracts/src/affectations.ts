// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { creerSchemaTri, zPaginationQuery, zSearchFilter, zUuid } from './common';

/** Affectation pédagogique — lecture (enregistrée en base). */
export const zAffectationPedagogique = z.object({
  id: zUuid,
  versionId: zUuid,
  semestreId: zUuid,
  departementId: zUuid,
  enseignantId: zUuid,
  matiereId: zUuid,
  groupeId: zUuid,
  typeEnseignementId: zUuid.nullable(),
  volumeHebdo: z.number().int().positive('Le volume hebdomadaire doit être strictement positif'),
  dureeCreneaux: z
    .number()
    .int()
    .positive('La durée de créneau doit être strictement positive')
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Données de création d'une affectation pédagogique.
 * `departementId` est déduit du contexte utilisateur, pas du corps de la requête.
 */
export const zAffectationPedagogiqueCreate = z.object({
  versionId: zUuid.optional(),
  semestreId: zUuid,
  enseignantId: zUuid,
  matiereId: zUuid,
  groupeId: zUuid,
  typeEnseignementId: zUuid.optional(),
  volumeHebdo: z.number().int().positive('Le volume hebdomadaire doit être strictement positif'),
  dureeCreneaux: z
    .number()
    .int()
    .positive('La durée de créneau doit être strictement positive')
    .optional(),
});

/** Données de création en cascade depuis un plan d'études. */
export const zAffectationPedagogiqueCascade = z.object({
  versionId: zUuid,
  planEtudesId: zUuid,
  planEtudesMatiereId: zUuid,
  enseignantId: zUuid,
});

/** Données de modification d'une affectation pédagogique. */
export const zAffectationPedagogiqueUpdate = z.object({
  id: zUuid,
  versionId: zUuid.optional(),
  semestreId: zUuid.optional(),
  departementId: zUuid.optional(),
  enseignantId: zUuid.optional(),
  matiereId: zUuid.optional(),
  groupeId: zUuid.optional(),
  typeEnseignementId: zUuid.optional().nullable(),
  volumeHebdo: z
    .number()
    .int()
    .positive('Le volume hebdomadaire doit être strictement positif')
    .optional(),
  dureeCreneaux: z
    .number()
    .int()
    .positive('La durée de créneau doit être strictement positive')
    .optional()
    .nullable(),
});

/** Identifiant d'une affectation pédagogique en paramètre de route. */
export const zAffectationPedagogiqueParams = z.object({
  id: zUuid,
});

/** Filtres de la liste des affectations pédagogiques. */
export const zAffectationPedagogiqueListFilters = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['volumeHebdo', 'createdAt', 'updatedAt']).shape)
  .extend({
    versionId: zUuid.optional(),
    semestreId: zUuid.optional(),
    departementId: zUuid.optional(),
    enseignantId: zUuid.optional(),
    matiereId: zUuid.optional(),
    groupeId: zUuid.optional(),
    typeEnseignementId: zUuid.optional(),
  });

export type AffectationPedagogique = z.infer<typeof zAffectationPedagogique>;
export type AffectationPedagogiqueCreate = z.infer<typeof zAffectationPedagogiqueCreate>;
export type AffectationPedagogiqueCascade = z.infer<typeof zAffectationPedagogiqueCascade>;
export type AffectationPedagogiqueUpdate = z.infer<typeof zAffectationPedagogiqueUpdate>;
export type AffectationPedagogiqueParams = z.infer<typeof zAffectationPedagogiqueParams>;
export type AffectationPedagogiqueQuery = z.infer<typeof zAffectationPedagogiqueListFilters>;
export type AffectationPedagogiqueListFilters = AffectationPedagogiqueQuery;
