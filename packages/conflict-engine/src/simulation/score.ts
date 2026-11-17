// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { Conflit } from '../types';

/**
 * Poids des sévérités de conflit pour le calcul du score global.
 * Aligné sur docs/SPEC_CONTRAINTES_GENERATION.md §2.1 :
 *   - HARD = 100 (fixe, violation = génération impossible)
 *   - SOFT = 1-99 (configurable, défaut catalogue)
 *   - INFORMATION = 0 (purement informatif)
 *
 * Les valeurs SOFT retenues (20 pour AVERTISSEMENT, 0 pour INFORMATION)
 * correspondent aux poids par défaut du catalogue de contraintes souples
 * (SC-PREF-02 = 20, SC-CONT-05 = 20, SC-PED-04 = 15, etc.).
 */
const POIDS_SEVERITE: Record<Conflit['severite'], number> = {
  BLOQUANT: 100,
  AVERTISSEMENT: 20,
  INFORMATION: 0,
} as const;

/**
 * Calcule la pénalité totale d'une liste de conflits.
 * Un conflit BLOQUANT pénalisera à 100 → score 0.
 * @param conflits - conflits détectés par le moteur
 * @returns pénalité totale (≥ 0)
 */
export function pondererConflits(conflits: Conflit[]): number {
  return conflits.reduce((total, c) => total + POIDS_SEVERITE[c.severite], 0);
}

/**
 * Convertit une pénalité en score global 0-100.
 * @param penalite - pénalité totale (≥ 0)
 * @returns score dans [0, 100]
 */
export function calculerScore(penalite: number): number {
  if (penalite <= 0) return 100;
  return Math.max(0, 100 - Math.floor(penalite));
}
