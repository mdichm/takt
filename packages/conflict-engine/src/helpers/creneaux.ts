// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Utilitaires de manipulation des créneaux pour le calcul de chevauchement.
 * Toutes les fonctions sont pures et déterministes.
 */

/** Index d'un créneau dans la liste ordonnée, ou -1 si absent. */
export function indexCreneau(creneauId: string, creneauxOrdonnees: string[]): number {
  return creneauxOrdonnees.indexOf(creneauId);
}

/** Intervalle occupé par une séance : [debut, fin] inclus dans la liste ordonnée. */
export interface IntervalleCreneaux {
  debut: number; // index inclus
  fin: number; // index inclus
}

/**
 * Calcule l'intervalle occupé par une séance.
 * Retourne null si le créneau de début est inconnu de la liste ordonnée.
 */
export function intervalleSeance(
  creneauDebutId: string,
  nbCreneaux: number,
  creneauxOrdonnees: string[],
): IntervalleCreneaux | null {
  const debut = indexCreneau(creneauDebutId, creneauxOrdonnees);
  if (debut === -1) return null;
  const nombre = Math.max(1, nbCreneaux);
  return { debut, fin: debut + nombre - 1 };
}

/** Deux intervalles de créneaux se chevauchent-ils ? */
export function intervallesSeChevauchent(a: IntervalleCreneaux, b: IntervalleCreneaux): boolean {
  return Math.max(a.debut, b.debut) <= Math.min(a.fin, b.fin);
}

/**
 * Deux séances se chevauchent-elles (même jour, mêmes créneaux) ?
 * Retourne false si l'un des créneaux de début est inconnu.
 */
export function seancesSeChevauchent(
  a: { jour: Date; creneauDebutId: string; nbCreneaux: number },
  b: { jour: Date; creneauDebutId: string; nbCreneaux: number },
  creneauxOrdonnees: string[],
): boolean {
  if (a.jour.getTime() !== b.jour.getTime()) return false;
  const ia = intervalleSeance(a.creneauDebutId, a.nbCreneaux, creneauxOrdonnees);
  const ib = intervalleSeance(b.creneauDebutId, b.nbCreneaux, creneauxOrdonnees);
  if (!ia || !ib) return false;
  return intervallesSeChevauchent(ia, ib);
}
