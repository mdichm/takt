// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { ChargeRuleSet, ChargeEnseignant, AlerteCharge, StatutCharge } from './types';

/**
 * Détermine le statut de charge d'un enseignant selon les seuils configurés.
 *
 * Règles :
 * - Si chargeArrondie > plafondHebdomadaire → BLOQUANT
 * - Sinon si taux >= seuilAlerte ET taux !== 100 → AVERTISSEMENT (pas d'alerte à 100 % exact)
 * - Sinon → CONFORME
 *
 * @param charge - Charge calculée de l'enseignant
 * @param ruleSet - Jeu de règles
 * @returns Statut de charge
 */
export function determinerStatut(charge: ChargeEnseignant, ruleSet: ChargeRuleSet): StatutCharge {
  if (charge.depassePlafond) {
    return 'BLOQUANT';
  }

  // Pas d'avertissement à 100 % exactement (critère de la fiche L05-03)
  if (charge.taux >= ruleSet.seuilAlerte && Math.abs(charge.taux - 100) > Number.EPSILON) {
    return 'AVERTISSEMENT';
  }

  return 'CONFORME';
}

/**
 * Génère les alertes pour un enseignant.
 */
export function genererAlertesEnseignant(
  charge: ChargeEnseignant,
  ruleSet: ChargeRuleSet
): AlerteCharge[] {
  const alertes: AlerteCharge[] = [];

  if (charge.depassePlafond) {
    alertes.push({
      type: 'DEPASSEMENT_PLAFOND',
      severite: 'BLOQUANT',
      enseignantId: charge.enseignantId,
      message: `Dépassement du plafond de charge (${charge.chargeArrondie} h > ${ruleSet.plafondHebdomadaire} h)`,
      details: {
        chargeArrondie: charge.chargeArrondie,
        plafond: ruleSet.plafondHebdomadaire,
      },
    });
  } else if (charge.taux >= ruleSet.seuilAlerte && Math.abs(charge.taux - 100) > Number.EPSILON) {
    alertes.push({
      type: 'SEUIL_ALERTE',
      severite: 'AVERTISSEMENT',
      enseignantId: charge.enseignantId,
      message: `Seuil d'alerte atteint (${charge.taux.toFixed(1)} % ≥ ${ruleSet.seuilAlerte} %)`,
      details: {
        taux: charge.taux,
        seuil: ruleSet.seuilAlerte,
      },
    });
  }

  return alertes;
}

/**
 * Génère les alertes pour l'équilibrage intra-département.
 */
export function genererAlertesEquilibrage(
  departements: Array<{ departementId: string; ecart: number }>,
  ruleSet: ChargeRuleSet
): AlerteCharge[] {
  const alertes: AlerteCharge[] = [];

  for (const dep of departements) {
    if (dep.ecart > ruleSet.toleranceEquilibrage) {
      alertes.push({
        type: 'ECART_EQUILIBRAGE',
        severite: 'AVERTISSEMENT',
        departementId: dep.departementId,
        message: `Écart d'équilibrage excessif (${dep.ecart} h > tolérance ${ruleSet.toleranceEquilibrage} h)`,
        details: {
          ecart: dep.ecart,
          tolerance: ruleSet.toleranceEquilibrage,
        },
      });
    }
  }

  return alertes;
}