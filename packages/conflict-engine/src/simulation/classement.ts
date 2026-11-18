// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { AlternativeSimulee } from './types';

/**
 * Poids de chaque sous-score pour le tri de départage.
 * Aligné sur docs/SPEC_SOLVER_CPSAT.md §7 :
 *   - continuité (trous groupe/enseignant) : 30
 *   - heures tardives (fenêtre horaire)   : 40
 *   - préférences (vœux/covoiturage)      : 20
 */
const POIDS_CONTINUITE = 30;
const POIDS_HEURES_TARDIVES = 40;
const POIDS_PREFERENCES = 20;

/**
 * Nombre maximal d'alternatives retournées (slice(0, 20)).
 */
const LIMITE_ALTERNATIVES = 20;

/**
 * Calcule le score de départage d'une alternative (0-10000).
 * Plus le score est élevé, meilleure est l'alternative à score global égal.
 */
function scoreDepartage(a: AlternativeSimulee): number {
  return (
    POIDS_CONTINUITE * a.sousScores.continuite +
    POIDS_HEURES_TARDIVES * a.sousScores.heuresTardives +
    POIDS_PREFERENCES * a.sousScores.preferences
  );
}

/**
 * Classe les alternatives par qualité décroissante.
 *
 * Ordre de tri :
 * 1. score global décroissant
 * 2. score de départage (sous-scores pondérés) décroissant
 * 3. creneauDebutId croissant (tie-break déterministe)
 * 4. salleId croissant (tie-break déterministe)
 *
 * Le résultat est tronqué aux 20 meilleures alternatives.
 *
 * @param alternatives - alternatives évaluées
 * @returns alternatives classées (max 20)
 */
export function classerAlternatives(
  alternatives: AlternativeSimulee[],
): AlternativeSimulee[] {
  return alternatives
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const sa = scoreDepartage(a);
      const sb = scoreDepartage(b);
      if (sb !== sa) return sb - sa;
      const ca = a.candidat.creneauDebutId;
      const cb = b.candidat.creneauDebutId;
      if (ca !== cb) return ca.localeCompare(cb);
      return a.candidat.salleId.localeCompare(b.candidat.salleId);
    })
    .slice(0, LIMITE_ALTERNATIVES);
}
