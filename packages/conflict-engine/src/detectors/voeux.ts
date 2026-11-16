// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';
import { intervalleSeance } from '../helpers/creneaux';

/**
 * CONFLIT VŒU (AVERTISSEMENT)
 * Le créneau de la séance figure dans les créneaux indésirables du vœu de l'enseignant.
 */
export function detecterConflitVoeux(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!contexte.voeux || contexte.voeux.creneauxIndesirables.length === 0) return null;

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

  const indesirable = [...creneauxOccupes].find((c) => contexte.voeux!.creneauxIndesirables.includes(c));
  if (!indesirable) return null;

  return {
    type: 'VOEU',
    severite: 'AVERTISSEMENT',
    message: `Conflit vœu : la séance ${seance.id} est placée sur un créneau indésirable (${indesirable}) selon le vœu de l'enseignant.`,
    details: {
      seanceId: seance.id,
      enseignantId: seance.enseignantId,
      creneauIndesirable: indesirable,
      creneauxIndesirables: contexte.voeux.creneauxIndesirables,
    },
  };
}
