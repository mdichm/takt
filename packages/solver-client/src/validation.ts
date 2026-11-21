// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  zSolverOutput,
  zSolverScenario,
  type SolverScenario,
} from '@takt/contracts';
import { SolverError } from './errors';

const MAX_STDOUT_PREVIEW = 2000;

/**
 * Parse la sortie brute du worker solveur (fichier de résultats).
 *
 * Deux formats sont acceptés :
 *  1. Enveloppe { scenarios: Scenario[], metrics?: {...} }  (schéma zSolverOutput)
 *  2. Tableau brut de scénarios [Scenario, ...]
 *
 * Toute violation du contrat lève une SolverError de type INVALID_OUTPUT.
 */
export function parseSolverOutput(raw: string): SolverScenario[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new SolverError(
      'INVALID_OUTPUT',
      "La sortie du solveur n'est pas un JSON valide",
      {
        details: { stdout: raw.slice(0, MAX_STDOUT_PREVIEW) },
        cause,
      },
    );
  }

  // --- Format enveloppe (contrat canonique) ---
  const output = zSolverOutput.safeParse(parsed);
  if (output.success) {
    return output.data.scenarios;
  }

  // --- Format tableau brut de scénarios ---
  if (Array.isArray(parsed)) {
    const scenarios: SolverScenario[] = [];
    const issues: Array<{ path: (string | number)[]; message: string }> = [];
    for (const item of parsed) {
      const scenario = zSolverScenario.safeParse(item);
      if (scenario.success) {
        scenarios.push(scenario.data);
      } else {
        issues.push(...scenario.error.issues.map((i) => ({ path: i.path, message: i.message })));
      }
    }
    if (issues.length === 0) {
      return scenarios;
    }
    throw new SolverError(
      'INVALID_OUTPUT',
      'La sortie du solveur ne respecte pas le contrat de scénarios',
      {
        details: {
          zodIssues: issues,
          stdout: JSON.stringify(parsed).slice(0, MAX_STDOUT_PREVIEW),
        },
      },
    );
  }

  // --- Aucun format reconnu ---
  const issues = output.error.issues.map((i) => ({
    path: i.path,
    message: i.message,
  }));
  throw new SolverError(
    'INVALID_OUTPUT',
    "La sortie du solveur ne respecte ni l'enveloppe { scenarios } ni un tableau de scénarios",
    {
      details: {
        zodIssues: issues,
        stdout: JSON.stringify(parsed).slice(0, MAX_STDOUT_PREVIEW),
      },
    },
  );
}
