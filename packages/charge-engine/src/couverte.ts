// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type {
  AffectationCouverture,
  CouvertureAffectation,
  CouvertureDepartement,
  ResultatCouverture,
  SeanceCouverture,
  StatutCouverture,
} from './types';

const MINUTES_PAR_HEURE = 60;

/**
 * Calcule le taux de couverture pédagogique d'une version.
 *
 * Fonction pure, déterministe, sans effets de bord (aucune dépendance I/O,
 * base de données, réseau, horloge, aléatoire). Même entrée → même sortie.
 *
 * Règles (TE-MET-01, TE-MET-02, RB-UI-06) :
 * 1. Volume déclaré d'une affectation = volumeHebdo × 60 (minutes).
 * 2. Volume planifié d'une affectation = somme nbCreneaux × dureeCreneauMinutes
 *    de ses séances planifiées.
 * 3. Statut par affectation :
 *    - CONFORME si volume planifié === volume déclaré.
 *    - SOUS_PLANIFICATION si volume planifié < volume déclaré (bloquant).
 *    - SUR_PLANIFICATION si volume planifié > volume déclaré (bloquant).
 * 4. Une séance liée à une affectation inconnue est orpheline (bloquant).
 * 5. Une version est conforme si et seulement si toutes les affectations sont
 *    CONFORME et qu'il n'y a aucune séance orpheline.
 *
 * @param affectations - Affectations pédagogiques de la version (entrées)
 * @param seances - Séances planifiées de la version (entrées)
 * @returns Résultat global de couverture par affectation et par département
 */
export function computeCouverture(
  affectations: readonly AffectationCouverture[],
  seances: readonly SeanceCouverture[],
): ResultatCouverture {
  // Map affectationId -> affectation (recherche O(1))
  const affectationParId = new Map<string, AffectationCouverture>();
  for (const aff of affectations) {
    affectationParId.set(aff.id, aff);
  }

  // Accumulateurs de volume planifié par affectation
  const planifieParAffectation = new Map<string, number>();
  // Séances orphelines (liées à une affectation inconnue)
  const seancesOrphelines: string[] = [];

  for (const seance of seances) {
    const aff = affectationParId.get(seance.affectationId);
    if (!aff) {
      // Séance orpheline : bloquante, ignorée dans l'agrégation par affectation
      seancesOrphelines.push(seance.id);
      continue;
    }
    const prev = planifieParAffectation.get(seance.affectationId) ?? 0;
    planifieParAffectation.set(
      seance.affectationId,
      prev + seance.nbCreneaux * seance.dureeCreneauMinutes,
    );
  }

  // Résultat par affectation (tri déterministe sur l'identifiant)
  const parAffectation: CouvertureAffectation[] = [];
  const affectationIds = Array.from(affectationParId.keys()).sort();
  for (const id of affectationIds) {
    const aff = affectationParId.get(id)!;
    const volumeDeclareMinutes = aff.volumeHebdo * MINUTES_PAR_HEURE;
    const volumePlanifieMinutes = planifieParAffectation.get(id) ?? 0;

    const taux =
      volumeDeclareMinutes > 0
        ? (volumePlanifieMinutes / volumeDeclareMinutes) * 100
        : 0;

    let statut: StatutCouverture;
    if (volumeDeclareMinutes === 0) {
      // Cas défensif (volumeHebdo = 0 non autorisé par le schéma Zod, mais géré)
      statut =
        volumePlanifieMinutes === 0 ? 'CONFORME' : 'SUR_PLANIFICATION';
    } else if (volumePlanifieMinutes === volumeDeclareMinutes) {
      statut = 'CONFORME';
    } else if (volumePlanifieMinutes < volumeDeclareMinutes) {
      statut = 'SOUS_PLANIFICATION';
    } else {
      statut = 'SUR_PLANIFICATION';
    }

    parAffectation.push({
      affectationId: id,
      departementId: aff.departementId,
      volumeDeclareMinutes,
      volumePlanifieMinutes,
      taux,
      statut,
    });
  }

  // Agrégation par département
  const declareParDepartement = new Map<string, number>();
  // Seulement les départements ayant du volume planifié (la map reste clairsemée
  // afin que planifieParDepartement.get() puisse retourner undefined pour un
  // département sans séance, rendant la garde ?? 0 de la ligne 116 atteignable).
  const planifieParDepartement = new Map<string, number>();
  for (const pa of parAffectation) {
    const d = declareParDepartement.get(pa.departementId) ?? 0;
    declareParDepartement.set(pa.departementId, d + pa.volumeDeclareMinutes);
    if (pa.volumePlanifieMinutes > 0) {
      const p = planifieParDepartement.get(pa.departementId) ?? 0;
      planifieParDepartement.set(pa.departementId, p + pa.volumePlanifieMinutes);
    }
  }

  const parDepartement: CouvertureDepartement[] = [];
  const departementIds = Array.from(declareParDepartement.keys()).sort();
  for (const departementId of departementIds) {
    const volumeDeclare = declareParDepartement.get(departementId)!;
    const volumePlanifie = planifieParDepartement.get(departementId) ?? 0;
    parDepartement.push({
      departementId,
      volumeDeclareMinutes: volumeDeclare,
      volumePlanifieMinutes: volumePlanifie,
      taux:
        volumeDeclare > 0 ? (volumePlanifie / volumeDeclare) * 100 : 0,
    });
  }

  // Taux global
  let totalDeclareMinutes = 0;
  let totalPlanifieMinutes = 0;
  for (const pa of parAffectation) {
    totalDeclareMinutes += pa.volumeDeclareMinutes;
    totalPlanifieMinutes += pa.volumePlanifieMinutes;
  }
  const tauxGlobal =
    totalDeclareMinutes > 0
      ? (totalPlanifieMinutes / totalDeclareMinutes) * 100
      : 0;

  // Conforme = toutes les affectations CONFORME et aucune séance orpheline
  const toutesConformes = parAffectation.every(
    (pa) => pa.statut === 'CONFORME',
  );
  const estConforme = toutesConformes && seancesOrphelines.length === 0;

  return {
    parAffectation,
    parDepartement,
    tauxGlobal,
    estConforme,
    seancesOrphelines: seancesOrphelines.sort(),
  };
}