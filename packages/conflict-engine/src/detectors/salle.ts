// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';
import { seancesSeChevauchent } from '../helpers/creneaux';

/**
 * CONFLIT SALLE (BLOQUANT, HC-RES-02)
 * La salle est déjà occupée sur un créneau chevauchant le même jour.
 */
export function detecterConflitSalle(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.salleId) return null;

  const cible = {
    jour: seance.jour,
    creneauDebutId: seance.creneauDebutId,
    nbCreneaux: seance.nbCreneaux ?? 1,
  };

  const conflit = contexte.seancesConcurrentes.find((s) => {
    if (s.salleId !== seance.salleId) return false;
    return seancesSeChevauchent(cible, s, contexte.creneauxOrdonnees);
  });

  if (!conflit) return null;

  return {
    type: 'SALLE',
    severite: 'BLOQUANT',
    message: `Conflit salle : la salle ${seance.salleId} est déjà occupée par la séance ${conflit.id} le même jour sur un créneau chevauchant.`,
    details: {
      salleId: seance.salleId,
      seanceId: seance.id,
      seanceConcurrenteId: conflit.id,
      jour: seance.jour.toISOString(),
      creneauDebutId: seance.creneauDebutId,
    },
  };
}
