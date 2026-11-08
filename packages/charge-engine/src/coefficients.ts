// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { ChargeRuleSet, AffectationCharge } from './types';

/**
 * Calcule le volume pondéré par le coefficient du type d'enseignement.
 *
 * Si le type d'enseignement n'est pas renseigné ou n'a pas de coefficient configuré,
 * le coefficient par défaut est 1.
 *
 * @param affectation - Affectation à pondérer
 * @param ruleSet - Jeu de règles contenant les coefficients
 * @returns Volume × coefficient
 */
export function appliquerCoefficient(
  affectation: AffectationCharge,
  ruleSet: ChargeRuleSet
): number {
  const codeType = affectation.typeEnseignementCode;
  if (!codeType) {
    return affectation.volumeHebdo;
  }

  const coefficient = ruleSet.coefficientsParTypeEnseignement[codeType];
  if (coefficient === undefined || coefficient === null) {
    // Type non mappé : coefficient par défaut = 1
    return affectation.volumeHebdo;
  }

  return affectation.volumeHebdo * coefficient;
}