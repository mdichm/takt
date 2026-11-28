// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  type PlanEtudesMatiere,
  type AffectationPedagogique,
} from '@takt/contracts';

/**
 * Résultat de calcul de couverture d’un plan d’études.
 *
 * Pour chaque matière du plan, indique si elle est couverte par au moins
 * une affectation pédagogique et combien d’heures sont prévues.
 */
export interface CouvertureMatiere {
  matiereId: string;
  matiereLibelle: string;
  typeEnseignement: string;
  heuresPrevues: number;
  heuresAffectees: number;
  couverte: boolean;
  tauxCouverture: number; // 0 à 100
}

/**
 * Calcule la couverture d’un plan d’études à partir des matières du plan
 * et des affectations pédagogiques déjà saisies.
 */
export function calculerCouverturePlan(
  matieresPlan: PlanEtudesMatiere[],
  affectations: AffectationPedagogique[],
): CouvertureMatiere[] {
  // Indexer les affectations par matiereId
  const heuresParMatiere = new Map<string, number>();
  for (const aff of affectations) {
    const actuel = heuresParMatiere.get(aff.matiereId) ?? 0;
    heuresParMatiere.set(aff.matiereId, actuel + (aff.volumeHebdo ?? 0));
  }

  return matieresPlan.map((m) => {
    const heuresAffectees = heuresParMatiere.get(m.matiereId) ?? 0;
    const heuresPrevues = m.volumeHoraire ?? 0;
    const couverte = heuresAffectees >= heuresPrevues;
    const tauxCouverture =
      heuresPrevues > 0
        ? Math.min(100, Math.round((heuresAffectees / heuresPrevues) * 100))
        : 100;

    return {
      matiereId: m.matiereId,
      matiereLibelle: m.matiereLibelle ?? '',
      typeEnseignement: m.typeEnseignementLibelle ?? '',
      heuresPrevues,
      heuresAffectees,
      couverte,
      tauxCouverture,
    };
  });
}

/**
 * Retourne le taux de couverture global du plan (moyenne pondérée par heures prévues).
 */
export function tauxCouvertureGlobal(couverture: CouvertureMatiere[]): number {
  if (couverture.length === 0) return 100;
  const totalPrevues = couverture.reduce(
    (s, c) => s + c.heuresPrevues,
    0,
  );
  if (totalPrevues === 0) return 100;
  const totalAffectees = couverture.reduce(
    (s, c) => s + c.heuresAffectees,
    0,
  );
  return Math.min(100, Math.round((totalAffectees / totalPrevues) * 100));
}

/**
 * Liste les IDs de matières non couvertes (taux < 100%).
 */
export function matieresNonCouvertes(couverture: CouvertureMatiere[]): string[] {
  return couverture.filter((c) => !c.couverte).map((c) => c.matiereId);
}
