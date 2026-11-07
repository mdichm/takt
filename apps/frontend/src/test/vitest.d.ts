// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

// Module augmentation pour ajouter le matcher toHaveNoViolations.
// export {} rend ce fichier un module TS (declare module = augmentation, pas remplacement).
export {};

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T = unknown> {
    /** Matcher axe-core : vérifie qu'un élément ne produit aucune violation d'accessibilité. */
    toHaveNoViolations(): void | Promise<void>;
  }
}