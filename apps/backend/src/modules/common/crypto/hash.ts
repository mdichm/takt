// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { createHash } from 'node:crypto';

/**
 * Sérialise une valeur de façon déterministe pour le hash d'intégrité des snapshots.
 * Tri récursif des clés d'objets et des éléments de tableaux pour garantir
 * qu'une même donnée produit toujours le même hash (EX-DAT-01, GG-07).
 */
function sérialiserDéterministe(valeur: unknown): string {
  if (valeur === null || valeur === undefined) {
    return String(valeur);
  }
  if (typeof valeur === 'boolean' || typeof valeur === 'number') {
    return JSON.stringify(valeur);
  }
  if (typeof valeur === 'string') {
    return JSON.stringify(valeur);
  }
  if (Array.isArray(valeur)) {
    return '[' + valeur.map(sérialiserDéterministe).join(',') + ']';
  }
  if (typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>;
    const clés = Object.keys(objet).sort();
    return (
      '{' +
      clés
        .map((clé) => JSON.stringify(clé) + ':' + sérialiserDéterministe(objet[clé]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(valeur);
}

/**
 * Calcule le hash SHA-256 d'un objet JSON (sérialisé de façon déterministe).
 * Utilisé pour l'intégrité des snapshots (EX-DAT-01, GG-07).
 */
export function creerHashSHA256(donnees: unknown): string {
  const json = sérialiserDéterministe(donnees);
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Vérifie l'intégrité d'un snapshot en recalculant son hash.
 */
export function verifierHashSHA256(donnees: unknown, hashAttendu: string): boolean {
  return creerHashSHA256(donnees) === hashAttendu;
}