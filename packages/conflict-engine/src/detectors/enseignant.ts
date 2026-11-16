// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';
import { seancesSeChevauchent } from '../helpers/creneaux';

/**
 * CONFLIT ENSEIGNANT (BLOQUANT, HC-RES-01)
 * L'enseignant a déjà une séance sur un créneau chevauchant le même jour.
 */
export function detecterConflitEnseignant(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.enseignantId) return null;

  const cible = {
    jour: seance.jour,
    creneauDebutId: seance.creneauDebutId,
    nbCreneaux: seance.nbCreneaux ?? 1,
  };

  const conflit = contexte.seancesConcurrentes.find((s) => {
    if (s.enseignantId !== seance.enseignantId) return false;
    return seancesSeChevauchent(cible, s, contexte.creneauxOrdonnees);
  });

  if (!conflit) return null;

  return {
    type: 'ENSEIGNANT',
    severite: 'BLOQUANT',
    message: `Conflit enseignant : l'enseignant ${seance.enseignantId} a déjà une séance (${conflit.id}) le même jour sur un créneau chevauchant.`,
    details: {
      enseignantId: seance.enseignantId,
      seanceId: seance.id,
      seanceConcurrenteId: conflit.id,
      jour: seance.jour.toISOString(),
      creneauDebutId: seance.creneauDebutId,
    },
  };
}
