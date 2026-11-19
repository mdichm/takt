// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Types du client solveur CP-SAT.
 *
 * Les types du fichier dérivé d'entrée (DerivedFile, ...) proviennent du
 * schéma Zod partagé `@takt/contracts` (`zDerivedFile`), garantissant la
 * cohérence entre le builder (TAKT-L07-01) et le client solveur. Les types de
 * scénario de sortie (Scenario, SubScores, Placement) sont inférés des
 * schémas de sortie solveur (`zSolverScenario`, `zSolverSubScores`,
 * `zSolverPlacement`) définis dans `@takt/contracts`.
 */

export type {
  // Fichier dérivé d'entrée — schéma partagé @takt/contracts
  DerivedFile,
  DerivedMetadata,
  TimeGrid,
  DerivedRoom,
  DerivedTeacher,
  DerivedGroup,
  DerivedSubject,
  DerivedActivity,
  DerivedConstraint,
  DerivedLock,
  // Scénarios de sortie — schéma partagé @takt/contracts
  SolverScenario as Scenario,
  SolverSubScores as SubScores,
  SolverPlacement as Placement,
  SolverOutput,
} from '@takt/contracts';
