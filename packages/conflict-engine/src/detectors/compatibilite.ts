// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT COMPATIBILITE (AVERTISSEMENT)
 * Le type de la salle n'est pas compatible avec le type d'activité de la séance.
 */
export function detecterConflitCompatibilite(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  if (!seance.salleId || !seance.activite) return null;
  if (!contexte.salle || !contexte.salle.typeSalleId) return null;
  if (!contexte.typesSalleCompatibles) return null;

  const typesAcceptes = contexte.typesSalleCompatibles[seance.activite];
  if (!typesAcceptes || typesAcceptes.length === 0) return null;

  if (typesAcceptes.includes(contexte.salle.typeSalleId)) return null;

  return {
    type: 'COMPATIBILITE',
    severite: 'AVERTISSEMENT',
    message: `Conflit compatibilité : la salle ${seance.salleId} (type ${contexte.salle.typeSalleId}) n'est pas compatible avec l'activité ${seance.activite} (types acceptés : ${typesAcceptes.join(', ')}).`,
    details: {
      salleId: seance.salleId,
      seanceId: seance.id,
      activite: seance.activite,
      typeSalle: contexte.salle.typeSalleId,
      typesSalleAcceptes: typesAcceptes,
    },
  };
}
