// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { ChargeEnseignant, ChargeDepartement } from './types';

/**
 * Agrège les charges par département et calcule les indicateurs d'équilibrage.
 *
 * L'agrégation est déterministe : tri par identifiant d'enseignant puis par identifiant de département.
 *
 * @returns Ne retourne jamais (lance une erreur)
 */
export function agregerParDepartement(): ChargeDepartement[] {
  // Grouper par département (nécessite departementId dans l'entrée, on l'ajoute via une map externe)
  // Ici on reçoit déjà les charges avec enseignantId, on a besoin d'une map enseignantId -> departementId
  // Cette fonction sera appelée depuis compute-charge qui a accès à la map complète
  throw new Error('Utiliser agregerParDepartementAvecMap depuis compute-charge.ts');
}

/**
 * Version interne utilisée par computeCharge qui a accès à la map enseignant -> département.
 */
export function agregerParDepartementAvecMap(
  charges: ChargeEnseignant[],
  enseignantDepartement: Map<string, string>
): ChargeDepartement[] {
  const mapDep = new Map<string, ChargeEnseignant[]>();

  for (const charge of charges) {
    const depId = enseignantDepartement.get(charge.enseignantId);
    if (!depId) {
      continue; // sécurité : enseignant sans département connu
    }
    const arr = mapDep.get(depId) ?? [];
    arr.push(charge);
    mapDep.set(depId, arr);
  }

  const result: ChargeDepartement[] = [];

  for (const [depId, liste] of mapDep.entries()) {
    // Tri déterministe par identifiant d'enseignant
    liste.sort((a, b) => a.enseignantId.localeCompare(b.enseignantId));

    const chargesArrondies = liste.map((c) => c.chargeArrondie);
    const total = chargesArrondies.reduce((s, v) => s + v, 0);
    const moyenne = total / liste.length;
    const max = Math.max(...chargesArrondies);
    const min = Math.min(...chargesArrondies);
    const ecart = max - min;

    result.push({
      departementId: depId,
      totalCharge: total,
      moyenne,
      max,
      min,
      ecart,
      nombreEnseignants: liste.length,
    });
  }

  // Tri déterministe par identifiant de département
  result.sort((a, b) => a.departementId.localeCompare(b.departementId));

  return result;
}

/**
 * Calcule les écarts d'équilibrage avec indication de dépassement de tolérance.
 */
export function calculerEcartsEquilibrage(
  departements: ChargeDepartement[],
  toleranceEquilibrage: number
): Array<{ departementId: string; ecart: number; depasseTolerance: boolean }> {
  return departements.map((d) => ({
    departementId: d.departementId,
    ecart: d.ecart,
    depasseTolerance: d.ecart > toleranceEquilibrage,
  }));
}