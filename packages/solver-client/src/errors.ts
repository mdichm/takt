// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Erreurs typées du client solveur CP-SAT.
 * Conforme à SPEC_SOLVER_CPSAT §9 et à la fiche TAKT-L07-02.
 */

/** Codes d'erreur du client solveur. */
export type SolverErrorType =
  | 'TIMEOUT'
  | 'SOLVER_CRASH'
  | 'INVALID_OUTPUT'
  | 'MEMORY_EXCEEDED'
  | 'INFEASIBLE';

/** Détail structuré d'une erreur de solveur. */
export interface SolverErrorDetails {
  exitCode?: number | null;
  signal?: string | null;
  stderr?: string;
  stdout?: string;
  peakRssMb?: number | null;
  scenarioCount?: number;
  zodIssues?: Array<{ path: (string | number)[]; message: string }>;
}

/**
 * Erreur levée par SolverClient.
 * Aucune stack trace n'est exposée à l'appelant (conforme GG-06 / ST_TAKT §3.4).
 */
export class SolverError extends Error {
  readonly type: SolverErrorType;
  readonly durationMs: number;
  readonly details: SolverErrorDetails;

  constructor(
    type: SolverErrorType,
    message: string,
    options?: {
      durationMs?: number;
      details?: SolverErrorDetails;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SolverError';
    this.type = type;
    this.durationMs = options?.durationMs ?? 0;
    this.details = options?.details ?? {};
  }
}
