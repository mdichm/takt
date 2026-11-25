// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { zUuid, zPaginationQuery, zSearchFilter, creerSchemaTri } from './common';

/** Types de contrainte métier, alignés sur `Contrainte.type` et le mapping `contrainteTypeVersDerivee`. */
export const zTypeContrainte = z.enum([
  'INDISPONIBILITE',
  'EXIGENCE_SALLE',
  'PREFERENCE_CRENEAU',
  'CRENEAU_EVITE',
  'JOUR_PREFERE',
  'SALLE_PREFEREE',
  'SEANCES_CONSECUTIVES',
  'PAS_DE_TROUS_GROUPE',
  'PAS_DE_TROUS_ENSEIGNANT',
  'JOURNEES_COMPACTES',
  'CHARGE_MAX_JOUR',
  'CHARGE_MAX_SEMAINE',
  'EQUILIBRAGE_CHARGE',
]);

export type TypeContrainte = z.infer<typeof zTypeContrainte>;

/** Valeur d'une contrainte d'indisponibilité (enseignant, salle, groupe). */
const zValeurIndisponibilite = z.object({
  day: z.number().int().min(1).max(6),
  slots: z.array(z.number().int().min(0).max(23)).min(1).max(24),
  allDay: z.boolean().optional(),
});

/** Valeur d'une contrainte d'exigence de salle. */
const zValeurExigenceSalle = z.object({
  typeSalle: z.enum(['AMPHI', 'TD', 'TP', 'INFO']),
});

/** Valeur d'une préférence / créneau évité (jour + créneau). */
const zValeurPreferenceCreneau = z.object({
  day: z.number().int().min(1).max(6),
  slot: z.number().int().min(0).max(23),
});

/** Valeur d'un jour préféré. */
const zValeurJourPrefere = z.object({
  days: z.array(z.number().int().min(1).max(6)).min(1).max(6),
});

/** Valeur d'une salle préférée. */
const zValeurSallePreferee = z.object({
  salleId: zUuid,
});

/** Union discriminée de la valeur selon le type de contrainte. */
export const zValeurContrainte = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INDISPONIBILITE'), valeur: zValeurIndisponibilite }),
  z.object({ type: z.literal('EXIGENCE_SALLE'), valeur: zValeurExigenceSalle }),
  z.object({ type: z.literal('PREFERENCE_CRENEAU'), valeur: zValeurPreferenceCreneau }),
  z.object({ type: z.literal('CRENEAU_EVITE'), valeur: zValeurPreferenceCreneau }),
  z.object({ type: z.literal('JOUR_PREFERE'), valeur: zValeurJourPrefere }),
  z.object({ type: z.literal('SALLE_PREFEREE'), valeur: zValeurSallePreferee }),
  // Les types de CONFIG n'ont pas de valeur métier saisissable : valeur libre (texte/JSON)
  z.object({
    type: z.enum([
      'SEANCES_CONSECUTIVES',
      'PAS_DE_TROUS_GROUPE',
      'PAS_DE_TROUS_ENSEIGNANT',
      'JOURNEES_COMPACTES',
      'CHARGE_MAX_JOUR',
      'CHARGE_MAX_SEMAINE',
      'EQUILIBRAGE_CHARGE',
    ]),
    valeur: z.string().min(1),
  }),
]);

export type ValeurContrainte = z.infer<typeof zValeurContrainte>;

/** Contrainte existante (lecture). */
export const zContrainte = z.object({
  id: zUuid,
  versionId: zUuid,
  type: zTypeContrainte,
  cibleId: zUuid,
  valeur: z.string(),
  poids: z.number().int().min(1).max(100).nullable(),
  estActif: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Contrainte = z.infer<typeof zContrainte>;

/** Données de création d'une contrainte. */
export const zContrainteCreate = z.object({
  versionId: zUuid,
  type: zTypeContrainte,
  cibleId: zUuid,
  valeur: zValeurContrainte,
  poids: z.number().int().min(1).max(100).optional(),
  estActif: z.boolean().optional(),
});

export type ContrainteCreate = z.infer<typeof zContrainteCreate>;

/** Données de modification d'une contrainte. */
export const zContrainteUpdate = z.object({
  type: zTypeContrainte.optional(),
  cibleId: zUuid.optional(),
  valeur: zValeurContrainte.optional(),
  poids: z.number().int().min(1).max(100).optional().nullable(),
  estActif: z.boolean().optional(),
});

export type ContrainteUpdate = z.infer<typeof zContrainteUpdate>;

/** Paramètres de route d'une contrainte. */
export const zContrainteParams = z.object({
  id: zUuid,
});

export type ContrainteParams = z.infer<typeof zContrainteParams>;

/** Filtres de la liste des contraintes. */
export const zContrainteList = zPaginationQuery
  .extend(zSearchFilter.shape)
  .extend(creerSchemaTri(['type', 'createdAt']).shape)
  .extend({
    versionId: zUuid.optional(),
    type: zTypeContrainte.optional(),
    cibleId: zUuid.optional(),
    estActif: z.boolean().optional(),
  });

export type ContrainteListFilters = z.infer<typeof zContrainteList>;

/** Réponse paginée des contraintes. */
export const zContrainteListReponse = z.object({
  items: z.array(zContrainte),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export type ContrainteListReponse = z.infer<typeof zContrainteListReponse>;

/** Conflit détecté sur une contrainte (doublon / contradiction). */
export const zConflitContrainte = z.object({
  contrainteId: zUuid.nullable(),
  type: z.enum(['DOUBLON', 'CONTRADICTION']),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ConflitContrainte = z.infer<typeof zConflitContrainte>;

/** Réponse de création avec avertissements éventuels. */
export const zContrainteCreerReponse = z.object({
  contrainte: zContrainte,
  avertissements: z.array(z.string()),
});

export type ContrainteCreerReponse = z.infer<typeof zContrainteCreerReponse>;
