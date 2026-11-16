// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';
import { seancesSeChevauchent } from '../helpers/creneaux';

/**
 * CONFLIT GROUPE (BLOQUANT, HC-RES-03)
 * Le groupe a déjà une séance sur un créneau chevauchant le même jour.
 */
export function detecterConflitGroupe(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.groupeId) return null;

  const cible = {
    jour: seance.jour,
    creneauDebutId: seance.creneauDebutId,
    nbCreneaux: seance.nbCreneaux ?? 1,
  };

  const conflit = contexte.seancesConcurrentes.find((s) => {
    if (s.groupeId !== seance.groupeId) return false;
    return seancesSeChevauchent(cible, s, contexte.creneauxOrdonnees);
  });

  if (!conflit) return null;

  return {
    type: 'GROUPE',
    severite: 'BLOQUANT',
    message: `Conflit groupe : le groupe ${seance.groupeId} a déjà une séance (${conflit.id}) le même jour sur un créneau chevauchant.`,
    details: {
      groupeId: seance.groupeId,
      seanceId: seance.id,
      seanceConcurrenteId: conflit.id,
      jour: seance.jour.toISOString(),
      creneauDebutId: seance.creneauDebutId,
    },
  };
}
