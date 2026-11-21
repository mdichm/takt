// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Scénario retourné par le collaborateur solveur (y compris placements et sous-scores). */
export interface ScenarioSolveur {
  readonly id: string;
  readonly score: number;
  readonly subScores: Record<string, unknown>;
  readonly placements: Array<Record<string, unknown>>;
  readonly unplacedActivities: string[];
  readonly status: string;
}

/** Contrat minimal du collaborateur chargé d’exécuter le solveur. */
export interface Solveur {
  solve(fichierDerive: unknown): Promise<readonly ScenarioSolveur[]>;
}

/** Token d’injection du solveur, remplaçable par un double en test. */
export const SOLVEUR = Symbol('SOLVEUR');
