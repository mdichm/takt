// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT DONNEE_MANQUANTE (AVERTISSEMENT)
 * Une donnée requise pour l'analyse de conflits est absente, ce qui empêche certains contrôles.
 *
 * Par exemple : pas d'effectif sur le groupe → le contrôle de capacité ne peut pas être effectué.
 */
export function detecterConflitDonneeManquante(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  const manquantes: string[] = [];

  if (!seance.salleId) manquantes.push('salleId');
  if (!seance.enseignantId) manquantes.push('enseignantId');
  if (!seance.groupeId) manquantes.push('groupeId');
  if (!seance.activite) manquantes.push('activite');

  if (contexte.salle && contexte.groupe && contexte.groupe.effectif === undefined) {
    manquantes.push('groupe.effectif');
  }

  if (manquantes.length === 0) return null;

  return {
    type: 'DONNEE_MANQUANTE',
    severite: 'AVERTISSEMENT',
    message: `Conflit donnée manquante : la séance ${seance.id} ne renseigne pas ${manquantes.join(', ')} ; certains contrôles de conflits ne peuvent pas être effectués.`,
    details: {
      seanceId: seance.id,
      champsManquants: manquantes,
    },
  };
}
