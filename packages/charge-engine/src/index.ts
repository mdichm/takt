// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Moteur de charge horaire — TAKT
 * Package pur, déterministe, sans dépendance I/O.
 *
 * Point d'entrée principal : computeCharge(affectations, ruleSet)
 *
 * Exemple d'utilisation :
 * ```typescript
 * import { computeCharge, type ChargeRuleSet, type AffectationCharge } from '@takt/charge-engine';
 *
 * const ruleSet: ChargeRuleSet = {
 *   id: '...',
 *   code: 'CHARG-STD',
 *   libelle: 'Règles standard',
 *   version: 1,
 *   estActive: true,
 *   seuilAlerte: 90,
 *   plafondHebdomadaire: 20,
 *   arrondi: 'DEMI_JOURNEE',
 *   dureeJournee: 7,
 *   dureeDemiJournee: 3.5,
 *   coefficientsParTypeEnseignement: { CM: 1.5, TD: 1, TP: 1, PROJET: 1 },
 *   cibleHebdomadaireParGrade: { MCF: 19, PR: 19, ATER: 19, PAST: 19 },
 *   toleranceEquilibrage: 5,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 *
 * const affectations: AffectationCharge[] = [
 *   { id: 'a1', enseignantId: 'e1', departementId: 'd1', gradeCode: 'MCF', typeEnseignementCode: 'CM', volumeHebdo: 10 },
 *   { id: 'a2', enseignantId: 'e1', departementId: 'd1', gradeCode: 'MCF', typeEnseignementCode: 'TD', volumeHebdo: 8 },
 * ];
 *
 * const resultat = computeCharge(affectations, ruleSet);
 * console.log(resultat.parEnseignant[0].taux); // 100
 * ```
 */

export * from './types';
export * from './arrondi';
export * from './coefficients';
export * from './seuils';
export * from './equilibrage';
export { computeCharge } from './compute-charge';