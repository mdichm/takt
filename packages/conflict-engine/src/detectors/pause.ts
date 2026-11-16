// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';
import { intervalleSeance } from '../helpers/creneaux';

/**
 * CONFLIT PAUSE (AVERTISSEMENT)
 * La séance chevauche une période de pause (déconseil de placement).
 */
export function detecterConflitPause(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (contexte.pauses.length === 0) return null;

  const intervalle = intervalleSeance(
    seance.creneauDebutId,
    seance.nbCreneaux ?? 1,
    contexte.creneauxOrdonnees,
  );
  if (!intervalle) return null;

  const creneauxOccupes = new Set<string>();
  for (let i = intervalle.debut; i <= intervalle.fin; i += 1) {
    creneauxOccupes.add(contexte.creneauxOrdonnees[i]!);
  }

  for (const pause of contexte.pauses) {
    const chevauchant = pause.creneaux.find((c) => creneauxOccupes.has(c));
    if (chevauchant) {
      return {
        type: 'PAUSE',
        severite: 'AVERTISSEMENT',
        message: `Conflit pause : la séance ${seance.id} chevauche la période de pause "${pause.nom}" (créneau ${chevauchant}).`,
        details: {
          seanceId: seance.id,
          periodePause: pause.nom,
          creneauConflit: chevauchant,
          creneauxOccupes: Array.from(creneauxOccupes),
        },
      };
    }
  }

  return null;
}
