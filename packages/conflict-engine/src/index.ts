// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Moteur de conflits de planning — TAKT
 * Package pur, déterministe, sans dépendance I/O.
 *
 * Point d'entrée principal : detectConflicts(seance, contexte)
 *
 * Exemple d'utilisation :
 * ```typescript
 * import { detectConflicts, type SeanceAAnalyser, type ContexteConflits, type Conflit } from '@takt/conflict-engine';
 *
 * const conflits: Conflit[] = detectConflicts(seance, contexte);
 * if (aConflitBloquant(conflits)) {
 *   // HTTP 409 avec la liste complète des conflits
 * }
 * ```
 */

export * from './types';
export {
  detectConflicts,
  aConflitBloquant,
  LISTE_TYPES_CONFLIT,
  severiteParDefaut,
} from './detect-conflicts';
