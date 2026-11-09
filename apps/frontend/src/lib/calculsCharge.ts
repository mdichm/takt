// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  computeCharge,
  type ChargeRuleSet,
  type AffectationCharge,
  type ResultatCalculCharge,
  type StatutCharge,
} from '@takt/charge-engine';
import {
  type AffectationPedagogique,
  type PlanEtudesMatiere,
} from '@takt/contracts';

/*──────────────────────────────────────────────────────────────────────────────
  Jeu de règles par défaut (D3 — ChargeRuleSet DEFAUT)

  Miroite les valeurs du fallback backend (RepartitionService.chargerRuleSetActif
  ou ruleSetDefaut) afin que l'UI affiche les mêmes seuils que le serveur.
  Aucune borne max sur le volume horaire n'existe dans le contrat
  (zAffectationPedagogique impose seulement volumeHebdo > 0).
──────────────────────────────────────────────────────────────────────────────*/

export const CHARGE_RULE_SET_DEFAUT: ChargeRuleSet = {
  id: 'DEFAUT',
  code: 'DEFAUT',
  libelle: 'Règles par défaut (miroir backend)',
  version: 1,
  estActive: false,
  seuilAlerte: 90,
  plafondHebdomadaire: 20,
  arrondi: 'UNITAIRE',
  dureeJournee: 7,
  dureeDemiJournee: 3.5,
  coefficientsParTypeEnseignement: {},
  cibleHebdomadaireParGrade: {},
  toleranceEquilibrage: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/*──────────────────────────────────────────────────────────────────────────────
  Construction des entrées de charge depuis les affectations pédagogiques

  AffectationPedagogique ne porte pas directement gradeCode ni
  typeEnseignementCode (ce sont des IDs vers les référentiels). L'appelant
  peut fournir des enrichissements optionnels via deux maps.
──────────────────────────────────────────────────────────────────────────────*/

export interface EnrichissementAffectation {
  /** Map enseignantId → code de grade (ex: 'MCF', 'PR'). */
  gradeParEnseignant: Record<string, string>;
  /** Map typeEnseignementId → code (ex: 'CM', 'TD', 'TP'). */
  codeParTypeEnseignement: Record<string, string>;
}

export function construireAffectationsCharge(
  affectations: readonly AffectationPedagogique[],
  enrichissement: Partial<EnrichissementAffectation> = {},
): AffectationCharge[] {
  const { gradeParEnseignant = {}, codeParTypeEnseignement = {} } = enrichissement;

  return affectations.map((aff) => ({
    id: aff.id,
    enseignantId: aff.enseignantId,
    departementId: aff.departementId,
    gradeCode: gradeParEnseignant[aff.enseignantId],
    typeEnseignementCode:
      aff.typeEnseignementId !== null && aff.typeEnseignementId !== undefined
        ? codeParTypeEnseignement[aff.typeEnseignementId]
        : undefined,
    volumeHebdo: aff.volumeHebdo,
  }));
}

/*──────────────────────────────────────────────────────────────────────────────
  Calcul de la charge horaire (wrapper déterministe sur @takt/charge-engine)
──────────────────────────────────────────────────────────────────────────────*/

export function calculerCharge(
  affectationsCharge: readonly AffectationCharge[],
  ruleSet: ChargeRuleSet = CHARGE_RULE_SET_DEFAUT,
): ResultatCalculCharge {
  return computeCharge(affectationsCharge, ruleSet);
}

/*──────────────────────────────────────────────────────────────────────────────
  Détection des matières du plan d'études sans affectation (D4)

  Retourne les IDs de matières (planEtudesMatiere.id) pour lesquelles aucune
  affectation n'existe dans le département donné.
──────────────────────────────────────────────────────────────────────────────*/

export function detecterMatieresManquantes(
  matieresPlan: readonly PlanEtudesMatiere[],
  affectations: readonly AffectationPedagogique[],
): string[] {
  const matieresAffectees = new Set(
    affectations.map((aff) => aff.matiereId),
  );

  return matieresPlan
    .filter((m) => !matieresAffectees.has(m.matiereId))
    .map((m) => m.id);
}

/*──────────────────────────────────────────────────────────────────────────────
  Taux de couverture des charges horaires d'un département

  Rapport entre le volume affecté et le volume prévu au plan d'études.
──────────────────────────────────────────────────────────────────────────────*/

export interface TauxCouverture {
  departementId: string;
  volumePrevu: number;
  volumeAffecte: number;
  taux: number; // 0 à 100
  complet: boolean; // true si taux >= 100
}

export function calculerTauxCouverture(
  departementId: string,
  matieresPlan: readonly PlanEtudesMatiere[],
  affectations: readonly AffectationPedagogique[],
): TauxCouverture {
  const volumePrevu = matieresPlan.reduce(
    (acc, m) => acc + m.volumeHoraire,
    0,
  );

  const volumeAffecte = affectations
    .filter((aff) => aff.departementId === departementId)
    .reduce((acc, aff) => acc + aff.volumeHebdo, 0);

  const taux = volumePrevu > 0 ? (volumeAffecte / volumePrevu) * 100 : 0;

  return {
    departementId,
    volumePrevu,
    volumeAffecte,
    taux,
    complet: taux >= 100,
  };
}

/*──────────────────────────────────────────────────────────────────────────────
  Vérification de présence d'alertes bloquantes

  Utile pour désactiver le bouton « Valider » avant l'appel serveur.
──────────────────────────────────────────────────────────────────────────────*/

export function hasAlertesBloquantes(
  resultat: ResultatCalculCharge,
): boolean {
  return resultat.alertes.some((a) => a.severite === 'BLOQUANT');
}

export type { ChargeRuleSet, AffectationCharge, ResultatCalculCharge, StatutCharge };
export { computeCharge };