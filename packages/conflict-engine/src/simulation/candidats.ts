// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  intervalleSeance,
  intervallesSeChevauchent,
} from '../helpers/creneaux';
import type {
  CandidatPlacement,
  ContexteSimulation,
  SalleSimulation,
  SeanceOccupee,
} from './types';

/**
 * Génère les candidats de placement pour une séance.
 *
 * Les candidats sont le produit cartésien : (créneaux de début consécutifs du
 * même jour) × (salles disponibles). Des filtres optionnels permettent de
 * cibler un créneau de début ou une salle précise.
 *
 * @param params.contexte - contexte de simulation (créneaux, salles, séances occupées)
 * @param params.nbCreneaux - nombre de créneaux consécutifs requis
 * @param params.cibleCreneauDebutId - filtre optionnel sur le créneau de début
 * @param params.cibleSalleId - filtre optionnel sur la salle
 * @returns liste de candidats (non évalués)
 */
export function genererCandidats(params: {
  contexte: ContexteSimulation;
  nbCreneaux: number;
  cibleCreneauDebutId?: string;
  cibleSalleId?: string;
}): CandidatPlacement[] {
  const {
    contexte,
    nbCreneaux,
    cibleCreneauDebutId,
    cibleSalleId,
  } = params;
  const { creneaux, creneauxOrdonnees, salles } = contexte;

  const creneauxParId: Map<string, (typeof creneaux)[number]> = new Map();
  for (const c of creneaux) creneauxParId.set(c.id, c);

  const candidats: CandidatPlacement[] = [];

  for (const creneauId of creneauxOrdonnees) {
    const creneauDebut = creneauxParId.get(creneauId);
    if (!creneauDebut) continue;

    // Vérifier que nbCreneaux créneaux consécutifs existent sur le même jour
    const debutIndex = creneauxOrdonnees.indexOf(creneauId);
    let consecutifsValides = true;
    for (let k = 1; k < nbCreneaux; k++) {
      const suivantId = creneauxOrdonnees[debutIndex + k];
      if (!suivantId) { consecutifsValides = false; break; }
      const suivant = creneauxParId.get(suivantId);
      if (!suivant || suivant.jour !== creneauDebut.jour) {
        consecutifsValides = false;
        break;
      }
    }
    if (!consecutifsValides) continue;

    if (cibleCreneauDebutId && creneauId !== cibleCreneauDebutId) continue;

    for (const salle of salles) {
      if (cibleSalleId && salle.id !== cibleSalleId) continue;
      candidats.push({
        jour: creneauDebut.jour,
        creneauDebutId: creneauId,
        nbCreneaux,
        salleId: salle.id,
        enseignantId: contexte.enseignantId,
      });
    }
  }

  return candidats;
}

/**
 * Retourne les IDs des salles libres sur le créneau et la durée demandés.
 *
 * Une salle est considérée occupée si une séance déjà placée sur la même salle
 * et le même jour a des créneaux chevauchants.
 *
 * @param creneauDebutId - créneau de début du candidat
 * @param nbCreneaux - nombre de créneaux du candidat
 * @param salles - liste des salles candidates
 * @param seancesOccupees - séances déjà placées (concurrente)
 * @param creneauxOrdonnees - liste ordonnée des créneaux
 * @returns IDs des salles libres
 */
export function filtrerSallesLibres(
  creneauDebutId: string,
  nbCreneaux: number,
  salles: SalleSimulation[],
  seancesOccupees: SeanceOccupee[],
  creneauxOrdonnees: string[],
): string[] {
  const intervalleCandidat = intervalleSeance(
    creneauDebutId,
    nbCreneaux,
    creneauxOrdonnees,
  );
  if (!intervalleCandidat) return [];

  return salles
    .filter((salle) => {
      return !seancesOccupees.some((seance) => {
        if (seance.salleId !== salle.id) return false;
        if (seance.jour === undefined) return false;
        // Le jour du candidat est déduit de son créneau de début ; on le
        // retrouve via la séance occupée uniquement si même jour.
        // (Le jour du candidat n'est pas passé en paramètre ; on compare via
        //  les intervalles sur la liste ordonnée qui est triée par jour.)
        const intervalleSeanceOccupee = intervalleSeance(
          seance.creneauDebutId,
          seance.nbCreneaux,
          creneauxOrdonnees,
        );
        if (!intervalleSeanceOccupee) return false;
        return intervallesSeChevauchent(
          intervalleCandidat,
          intervalleSeanceOccupee,
        );
      });
    })
    .map((salle) => salle.id);
}
