// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { ModeArrondi } from './types';

/**
 * Applique l'arrondi configuré à une valeur horaire.
 *
 * Règles :
 * - UNITAIRE : arrondi à l'entier le plus proche (0.5 → 1, règle du banquier évitée : demi-supérieur)
 * - DEMI_JOURNEE : arrondi au multiple de dureeDemiJournee le plus proche (demi-supérieur)
 * - JOURNEE : arrondi au multiple de dureeJournee le plus proche (demi-supérieur)
 *
 * @param heures - Valeur horaire à arrondir (>= 0)
 * @param mode - Mode d'arrondi configuré
 * @param dureeJournee - Durée d'une journée en heures (pour mode JOURNEE)
 * @param dureeDemiJournee - Durée d'une demi-journée en heures (pour mode DEMI_JOURNEE)
 * @returns Valeur arrondie
 */
export function appliquerArrondi(
  heures: number,
  mode: ModeArrondi,
  dureeJournee: number,
  dureeDemiJournee: number
): number {
  if (heures <= 0) {
    return 0;
  }

  let pas: number;
  switch (mode) {
    case 'UNITAIRE':
      pas = 1;
      break;
    case 'DEMI_JOURNEE':
      pas = dureeDemiJournee;
      break;
    case 'JOURNEE':
      pas = dureeJournee;
      break;
    default:
      // Mode inconnu : on ne modifie pas la valeur (comportement défensif)
      return heures;
  }

  // Calcul du multiple le plus proche avec règle du demi-supérieur
  // Math.round utilise la règle du banquier (arrondi au pair), on force le demi-supérieur
  const multiple = heures / pas;
  const multipleArrondi = Math.floor(multiple + 0.5);
  return multipleArrondi * pas;
}

/**
 * Vérifie qu'un mode d'arrondi est valide.
 */
export function estModeArrondiValide(mode: string): mode is ModeArrondi {
  return mode === 'UNITAIRE' || mode === 'DEMI_JOURNEE' || mode === 'JOURNEE';
}