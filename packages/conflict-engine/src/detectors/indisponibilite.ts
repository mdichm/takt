// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Conflit, ContexteConflits, SeanceAAnalyser } from '../types';

/**
 * CONFLIT INDISPONIBILITE (BLOQUANT)
 * La salle, l'enseignant ou le groupe est indisponible sur le créneau de la séance.
 *
 * Les indisponibilités sont fournies par le contexte (plages connues de l'enseignant)
 * et par la liste des identifiants de contraintes d'indisponibilité actives sur la version.
 */
export function detecterConflitIndisponibilite(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit | null {
  const entites: Array<{ nom: string; id?: string; indisponibilites?: Date[] }> = [];

  if (contexte.salle) {
    entites.push({ nom: 'salle', id: contexte.salle.id });
  }
  if (contexte.enseignant) {
    entites.push({
      nom: 'enseignant',
      id: contexte.enseignant.id,
      indisponibilites: contexte.enseignant.indisponibilites,
    });
  }
  if (contexte.groupe) {
    entites.push({ nom: 'groupe', id: contexte.groupe.id });
  }

  const jourDebut = new Date(seance.jour);
  jourDebut.setHours(0, 0, 0, 0);
  const jourFin = new Date(jourDebut);
  jourFin.setDate(jourFin.getDate() + 1);

  for (const entite of entites) {
    // Indisponibilités explicites de l'entité (plages horaires connues).
    if (entite.indisponibilites) {
      const indispo = entite.indisponibilites.find((d) => d >= jourDebut && d < jourFin);
      if (indispo) {
        return {
          type: 'INDISPONIBILITE',
          severite: 'BLOQUANT',
          message: `Conflit indisponibilité : ${entite.nom} ${entite.id} est indisponible le ${seance.jour.toISOString()}.`,
          details: {
            entite: entite.nom,
            entiteId: entite.id,
            seanceId: seance.id,
            jour: seance.jour.toISOString(),
            indisponibilite: indispo.toISOString(),
          },
        };
      }
    }
  }

  // Contraintes d'indisponibilité actives sur la version (données externes, présence = conflit générique).
  if (contexte.contraintesIndisponibilite.length > 0) {
    return {
      type: 'INDISPONIBILITE',
      severite: 'BLOQUANT',
      message: `Conflit indisponibilité : ${contexte.contraintesIndisponibilite.length} contrainte(s) d'indisponibilité active(s) sur la version pour le jour de la séance.`,
      details: {
        seanceId: seance.id,
        jour: seance.jour.toISOString(),
        contraintes: contexte.contraintesIndisponibilite,
      },
    };
  }

  return null;
}
