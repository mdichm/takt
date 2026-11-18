// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Conflit,
  ContexteConflits,
  SeanceAAnalyser,
  SeveriteConflit,
} from '../types';

/**
 * CONFLIT REGLE_PEDAGOGIQUE (sévérité selon la règle)
 * Une règle pédagogique n'est pas respectée par la séance.
 *
 * Chaque règle fournie dans le contexte indique sa propre sévérité. Une règle respectée
 * n'émet aucun conflit. Une règle non respectée émet un conflit avec la sévérité de la règle.
 */
export function detecterConflitReglePedagogique(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  const nonRespectees = contexte.reglesPedagogiques.filter((r) => !r.estRespectee);
  if (nonRespectees.length === 0) return null;

  // Émet un conflit par règle non respectée, la plus sévère en premier pour lisibilité.
  const regle = nonRespectees.reduce((a, b) => {
    const ordre: Record<SeveriteConflit, number> = { BLOQUANT: 0, AVERTISSEMENT: 1, INFORMATION: 2 };
    return (ordre[a.severite]! <= ordre[b.severite]!) ? a : b;
  });

  return {
    type: 'REGLE_PEDAGOGIQUE',
    severite: regle.severite,
    message: `Conflit règle pédagogique : "${regle.libelle}" n'est pas respectée pour la séance ${seance.id}.`,
    details: {
      seanceId: seance.id,
      regleId: regle.id,
      libelle: regle.libelle,
      severite: regle.severite,
      ...(regle.details ?? {}),
    },
  };
}
