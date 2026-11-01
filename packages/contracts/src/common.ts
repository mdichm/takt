// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';

/** Identifiant technique au format UUID. */
export const zUuid = z.string().uuid('Identifiant UUID invalide');

/** Adresse e-mail d’un compte applicatif. */
export const zEmail = z.string().email('Adresse e-mail invalide');

/** Horodatage sérialisé au format ISO 8601. */
export const zDateIso = z.string().datetime('Horodatage ISO 8601 invalide');

/** Rôles applicatifs autorisés. */
export const zRoleCode = z.enum(['admin', 'gest', 'rdep', 'dir']);

/** États du cycle de vie d’une version de planning. */
export const zEtatVersion = z.enum([
  'initial',
  'rep_pedag',
  'brouillon',
  'generation',
  'edition',
  'valid_pedag',
  'valid_dir',
  'valide',
  'publie',
  'archive',
]);

/** Direction de tri d'une liste. */
export const zSortDirection = z.enum(['asc', 'desc'], {
  errorMap: () => ({ message: 'La direction de tri doit être asc ou desc' }),
});

/** Booléen accepté depuis une query string. */
export const zBooleanQuery = z.preprocess(
  (valeur) => {
    if (valeur === 'true') {
      return true;
    }
    if (valeur === 'false') {
      return false;
    }
    return valeur;
  },
  z.boolean({ invalid_type_error: 'Le filtre booléen doit être true ou false' }),
);

/** Paramètres de pagination communs aux listes. */
export const zPaginationQuery = z.object({
  page: z.coerce.number().int().positive('La page doit être supérieure à 0').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive('La taille de page doit être supérieure à 0')
    .max(200, 'La taille de page ne peut pas dépasser 200')
    .default(20),
});

/** Construit les paramètres de tri d'une liste à partir de sa liste blanche. */
export function creerSchemaTri<const Champs extends readonly [string, ...string[]]>(champs: Champs) {
  return z.object({
    sortBy: z.enum(champs, {
      errorMap: () => ({ message: 'Le champ de tri n’est pas autorisé' }),
    }).optional(),
    sortDirection: zSortDirection.optional(),
  });
}

/** Métadonnées de pagination d’une réponse de liste. */
export const zPaginationMeta = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(200),
  total: z.number().int().nonnegative(),
});

/** Filtres textuels communs aux listes. */
export const zSearchFilter = z.object({
  search: z.string().trim().min(1).optional(),
});

export type RoleCode = z.infer<typeof zRoleCode>;
export type EtatVersion = z.infer<typeof zEtatVersion>;
export type SortDirection = z.infer<typeof zSortDirection>;
export type PaginationQuery = z.infer<typeof zPaginationQuery>;
export type PaginationMeta = z.infer<typeof zPaginationMeta>;
