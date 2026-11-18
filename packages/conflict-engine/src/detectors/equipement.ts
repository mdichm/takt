// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT EQUIPEMENT (AVERTISSEMENT)
 * Un équipement requis par la séance est absent de la salle affectée.
 */
export function detecterConflitEquipement(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.salleId || !seance.equipementsRequises || seance.equipementsRequises.length === 0)
    return null;
  if (!contexte.salle) return null;
  const equipementsDisponibles = contexte.salle.equipements;

  const manquantes = seance.equipementsRequises.filter(
    (code) => !equipementsDisponibles.includes(code),
  );

  if (manquantes.length === 0) return null;

  return {
    type: 'EQUIPEMENT',
    severite: 'AVERTISSEMENT',
    message: `Conflit équipement : la salle ${seance.salleId} ne dispose pas des équipements requis : ${manquantes.join(', ')}.`,
    details: {
      salleId: seance.salleId,
      seanceId: seance.id,
      equipementsRequises: seance.equipementsRequises,
      equipementsManquants: manquantes,
      equipementsDisponibles: contexte.salle.equipements,
    },
  };
}
