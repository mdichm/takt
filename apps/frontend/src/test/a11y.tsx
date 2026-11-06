// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Vérifie qu'un élément ne produit aucune violation d'accessibilité axe-core.
 *
 * S'appuie sur le matcher `toHaveNoViolations` enregistré dans `setup.ts`.
 *
 * @param element - Élément DOM à auditer (null/undefined lève une erreur explicite).
 * @throws {Error} si l'élément est manquant.
 */
export async function expectAccessible(element: HTMLElement | null): Promise<void> {
  if (!element) {
    throw new Error('expectAccessible: élément DOM manquant (null ou indéfini)');
  }
  await expect(element).toHaveNoViolations();
}