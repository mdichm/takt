// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type Scenario, type PlacementPersistee } from '@takt/contracts';

/**
 * Regroupe les placements d'un scénario par identifiant d'activité.
 */
export function agruperPlacementsParActivite(
  scenario: Scenario,
): Map<string, PlacementPersistee[]> {
  const map = new Map<string, PlacementPersistee[]>();
  for (const placement of scenario.placements ?? []) {
    const liste = map.get(placement.activityId) ?? [];
    liste.push(placement);
    map.set(placement.activityId, liste);
  }
  return map;
}

/**
 * Calcule les écarts entre deux scénarios sur les placements communs.
 *
 * Retourne, pour chaque activité placée dans les deux scénarios :
 * - deplacees : activités dont le jour ou le créneau diffère
 * - sallesDiff : activités dont la salle diffère
 * - enseignantsDiff : activités dont l'enseignant diffère
 *
 * Une activité peut apparaître dans plusieurs listes (déplacement ET salle différente).
 */
export function calculerEcartes(
  scenarioA: Scenario,
  scenarioB: Scenario,
): {
  deplacees: string[];
  sallesDiff: string[];
  enseignantsDiff: string[];
} {
  const placementsA = agruperPlacementsParActivite(scenarioA);
  const placementsB = agruperPlacementsParActivite(scenarioB);

  const deplacees: string[] = [];
  const sallesDiff: string[] = [];
  const enseignantsDiff: string[] = [];

  const activitesCommunes = new Set([
    ...placementsA.keys(),
    ...placementsB.keys(),
  ]);

  for (const activiteId of activitesCommunes) {
    const listeA = placementsA.get(activiteId) ?? [];
    const listeB = placementsB.get(activiteId) ?? [];

    // Comparaison sur la première occurrence (cas standard : 1 placement par activité)
    const pa = listeA[0];
    const pb = listeB[0];

    if (!pa || !pb) {
      // Présent dans un scénario seulement : pas d'écart de placement à proprement parler
      continue;
    }

    if (pa.day !== pb.day || pa.slot !== pb.slot) {
      deplacees.push(activiteId);
    }
    if (pa.roomId !== pb.roomId) {
      sallesDiff.push(activiteId);
    }
    if (pa.teacherId !== pb.teacherId) {
      enseignantsDiff.push(activiteId);
    }
  }

  return { deplacees, sallesDiff, enseignantsDiff };
}

/**
 * Estime le nombre de séances non placées à partir du taux de couverture et du nombre de séances placées.
 *
 * Formule : nbNonPlacees = round(nbPlacees * (100 - couverture) / couverture)
 * Retourne 0 si la couverture est de 100 %.
 */
export function estimerNonPlacees(
  couverture: number,
  nbPlacees: number,
): number {
  if (couverture >= 100 || nbPlacees <= 0) {
    return 0;
  }
  return Math.round((nbPlacees * (100 - couverture)) / couverture);
}

/**
 * Calcule le score qualité (0-100) à partir des sous-scores du solveur.
 *
 * Moyenne des sous-scores : coverage, timeslotRespect, roomRespect, teacherRespect, continuity.
 */
export function calculerScoreQualite(sousScores: Record<string, number>): number {
  const clesQualite = [
    'coverage',
    'timeslotRespect',
    'roomRespect',
    'teacherRespect',
    'continuity',
  ];
  const valeurs = clesQualite
    .map((cle) => sousScores[cle])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valeurs.length === 0) {
    return 0;
  }
  return Math.round(
    valeurs.reduce((acc, v) => acc + v, 0) / valeurs.length,
  );
}

/**
 * Calcule le score d'équilibrage (0-100) à partir des sous-scores.
 */
export function calculerScoreEquilibrage(sousScores: Record<string, number>): number {
  const valeur = sousScores['loadBalance'];
  return typeof valeur === 'number' && Number.isFinite(valeur) ? Math.round(valeur) : 0;
}