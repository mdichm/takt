// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Conflit,
  ContexteConflits,
  SeanceAAnalyser,
  SeveriteConflit,
  SEVERITE_PAR_DEFAUT,
  TypeConflit,
  TYPES_CONFLIT,
} from './types';
import { detecterConflitEnseignant } from './detectors/enseignant';
import { detecterConflitGroupe } from './detectors/groupe';
import { detecterConflitSalle } from './detectors/salle';
import { detecterConflitCapacite } from './detectors/capacite';
import { detecterConflitEquipement } from './detectors/equipement';
import { detecterConflitCompatibilite } from './detectors/compatibilite';
import { detecterConflitIndisponibilite } from './detectors/indisponibilite';
import { detecterConflitPause } from './detectors/pause';
import { detecterConflitReglePedagogique } from './detectors/regle-pedagogique';
import { detecterConflitVerrou } from './detectors/verrou';
import { detecterConflitCovoiturage } from './detectors/covoiturage';
import { detecterConflitVoeux } from './detectors/voeux';
import { detecterConflitDonneeManquante } from './detectors/donnee-manquante';

/**
 * Détecte tous les conflits d'une séance dans un contexte donné.
 *
 * La fonction est pure et déterministe : mêmes entrées → mêmes sorties, dans le même ordre.
 * L'ordre de sortie est déterministe (par type, puis par message).
 * Au plus un conflit par type est émis.
 *
 * @param seance - séance à analyser
 * @param contexte - contexte d'exécution (toutes les données en mémoire)
 * @returns liste des conflits détectés
 */
export function detectConflicts(
  seance: SeanceAAnalyser,
  contexte: ContexteConflits,
): Conflit[] {
  const conflits: Conflit[] = [];

  const detecteurs: Array<() => Conflit | null> = [
    () => detecterConflitEnseignant(seance, contexte),
    () => detecterConflitGroupe(seance, contexte),
    () => detecterConflitSalle(seance, contexte),
    () => detecterConflitCapacite(seance, contexte),
    () => detecterConflitEquipement(seance, contexte),
    () => detecterConflitCompatibilite(seance, contexte),
    () => detecterConflitIndisponibilite(seance, contexte),
    () => detecterConflitPause(seance, contexte),
    () => detecterConflitReglePedagogique(seance, contexte),
    () => detecterConflitVerrou(seance, contexte),
    () => detecterConflitCovoiturage(seance, contexte),
    () => detecterConflitVoeux(seance, contexte),
    () => detecterConflitDonneeManquante(seance, contexte),
  ];

  for (const detecteur of detecteurs) {
    const conflit = detecteur();
    if (conflit) {
      conflits.push(conflit);
    }
  }

  // Tri déterministe : par type (ordre de TYPES_CONFLIT). Un conflit par type
  // au plus est émis, donc l'ordre de type suffit à garantir un ordre stable.
  conflits.sort((a, b) => TYPES_CONFLIT.indexOf(a.type) - TYPES_CONFLIT.indexOf(b.type));

  return conflits;
}

/**
 * Indique si au moins un conflit bloquant est présent.
 * Un conflit bloquant interdit la soumission de la séance (HTTP 409).
 */
export function aConflitBloquant(conflits: Conflit[]): boolean {
  return conflits.some((c) => c.severite === 'BLOQUANT');
}

/**
 * Liste des types de conflit supportés (13 codes).
 */
export const LISTE_TYPES_CONFLIT = TYPES_CONFLIT.slice();

/**
 * Sévérité par défaut pour un type de conflit donné.
 */
export function severiteParDefaut(type: TypeConflit): SeveriteConflit {
  return SEVERITE_PAR_DEFAUT[type];
}
