// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Applique un filtre de département sur un objet `where` Prisma.
 *
 * - Si `departementIds` est vide (admin/dir) : aucun filtre ajouté (tous les départements).
 * - Si `departementIds` contient des IDs (rdep) : ajoute `departementId: { in: [...] }`.
 *
 * @param where — objet where Prisma existant
 * @param departementIds — IDs des départements autorisés pour l'utilisateur connecté
 * @returns l'objet where enrichi du filtre département
 */
export function appliquerFiltreDepartement<T extends Record<string, unknown>>(
  where: T,
  departementIds: string[],
): T {
  if (!departementIds || departementIds.length === 0) {
    return where;
  }

  return {
    ...where,
    departementId: { in: departementIds },
  } as T;
}
