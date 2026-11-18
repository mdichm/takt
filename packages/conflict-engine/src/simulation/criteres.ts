// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { Conflit } from '../types';

/**
 * Critères de qualité d'un candidat de placement (0-100 chacun).
 * Aligné sur docs/SPEC_CONTRAINTES_GENERATION.md §4 (contraintes souples) et
 * docs/SPEC_SOLVER_CPSAT.md §7 (sous-scores pondérés par famille).
 *
 * Poids documentés utilisés pour les pénalités :
 *   - SC-PREF-02 (créneaux évités) = 20  → conflit VOEU = 20
 *   - SC-CONT-02/03 (trous groupe/enseignant) = 35/30 → continuité
 *   - SC-LOAD-04 (fenêtre horaire) = 40 · SC-PED-04 (éviter dernier créneau) = 15 → heures tardives
 */

/**
 * Évalue la continuité du placement.
 * Retourne 100 si le candidat est adjacent (ordre ±1) à une séance du même
 * enseignant ; 50 si adjacent uniquement à une séance du même groupe ; 0 sinon.
 *
 * @param candidat - { ordre, enseignantId, groupeId }
 * @param voisins - séances placées sur le même jour avec leur ordre
 * @returns score de continuité dans [0, 100]
 */
export function evaluerContinuite(
  candidat: { ordre: number; enseignantId: string; groupeId: string },
  voisins: Array<{ ordre: number; enseignantId: string; groupeId: string }>,
): number {
  const adjacent = voisins.filter(
    (v) => Math.abs(v.ordre - candidat.ordre) === 1,
  );

  if (adjacent.some((v) => v.enseignantId === candidat.enseignantId)) {
    return 100;
  }
  if (adjacent.some((v) => v.groupeId === candidat.groupeId)) {
    return 50;
  }
  return 0;
}

const HEURE_LIMITE_TARDIVE = '18:00';
const PENALITE_PAR_MINUTE_TARDIVE = 2;

/**
 * Évalue l'éloignement des créneaux tardifs.
 * Retourne 100 si la fin du créneau est <= 18h00.
 * Au-delà, pénalise de 2 points par minute de dépassement, plancher 0.
 *
 * @param candidat - { heureFin: string } au format ISO (HH:MM extrait)
 * @returns score d'heures tardives dans [0, 100]
 */
export function evaluerHeuresTardives(candidat: {
  heureFin: string;
}): number {
  const fin = extraireMinutes(candidat.heureFin);
  const limite = extraireMinutes(HEURE_LIMITE_TARDIVE);
  const depassement = Math.max(0, fin - limite);
  return Math.max(0, 100 - PENALITE_PAR_MINUTE_TARDIVE * depassement);
}

/**
 * Extrait le nombre de minutes depuis minuit depuis une heure HH:MM
 * contenue dans une chaîne (ISO ou HH:MM).
 */
function extraireMinutes(heure: string): number {
  const match = heure.match(/(\d{2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

const PENALITE_VOEU = 50;
const PENALITE_COVOITURAGE = 20;

/**
 * Évalue le respect des préférences de l'enseignant.
 * Pénalise 50 points par conflit VOEU et 20 points par conflit COVOITURAGE,
 * plancher 0.
 *
 * @param candidat - { enseignantId } (non utilisé directement, réservé)
 * @param conflits - conflits résiduels déjà détectés sur le candidat
 * @returns score de préférences dans [0, 100]
 */
export function evaluerPreferences(
  _candidat: { enseignantId?: string },
  conflits: Conflit[],
): number {
  let penalite = 0;
  for (const c of conflits) {
    if (c.type === 'VOEU') penalite += PENALITE_VOEU;
    else if (c.type === 'COVOITURAGE') penalite += PENALITE_COVOITURAGE;
  }
  return Math.max(0, 100 - penalite);
}
