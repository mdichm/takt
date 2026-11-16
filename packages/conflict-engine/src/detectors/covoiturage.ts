// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT COVOITURAGE (INFORMATION)
 * Préférence de covoiturage non satisfaite (n'empêche pas la soumission).
 */
export function detecterConflitCovoiturage(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!contexte.covoiturage || !contexte.covoiturage.actif) return null;
  if (contexte.covoiturage.compatible) return null;

  return {
    type: 'COVOITURAGE',
    severite: 'INFORMATION',
    message: `Conflit covoiturage : la séance ${seance.id} n'est pas compatible avec la contrainte de covoiturage de l'enseignant.`,
    details: {
      seanceId: seance.id,
      enseignantId: seance.enseignantId,
      covoiturageActif: contexte.covoiturage.actif,
      compatible: contexte.covoiturage.compatible,
    },
  };
}
