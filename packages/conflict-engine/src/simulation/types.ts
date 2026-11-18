// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type { Conflit } from '../types';

/**
 * Types de simulation d'alternatives de placement — TAKT-L06-06
 * Package pur, déterministe, sans dépendance I/O.
 */

/**
 * Créneau disponible sur la grille.
 */
export interface CreneauDisponible {
  id: string;
  jour: number;
  ordre: number;
  heureDebut: string; // HH:MM
  dureeMinutes: number;
}

/**
 * Salle connue du simulateur.
 */
export interface SalleSimulation {
  id: string;
  capacite: number;
}

/**
 * Séance déjà placée (concurrente) sur le jour considéré.
 */
export interface SeanceOccupee {
  id: string;
  jour: number;
  creneauDebutId: string;
  salleId?: string | null;
  nbCreneaux: number;
}

/**
 * Contexte d'exécution de la simulation. Toutes les données sont en mémoire ;
 * le simulateur ne fait aucune I/O.
 */
export interface ContexteSimulation {
  /** Créneaux de la grille (tous jours confondus). */
  creneaux: CreneauDisponible[];
  /** IDs des créneaux ordonnés (triés par jour puis ordre). */
  creneauxOrdonnees: string[];
  /** Salles disponibles. */
  salles: SalleSimulation[];
  /** Séances déjà occupées sur le jour de la séance simulée. */
  seancesOccupees: SeanceOccupee[];
  /** Enseignant de la séance simulée (optionnel si cible fournie). */
  enseignantId?: string;
  /** Groupe de la séance simulée (optionnel si cible fournie). */
  groupeId?: string;
  /** Salle originale de la séance simulée (pour le candidat par défaut). */
  salleIdOriginale?: string;
}

/**
 * Un candidat de placement généré par le simulateur.
 */
export interface CandidatPlacement {
  jour: number;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId: string;
  enseignantId?: string;
}

/**
 * Une alternative simulée, évaluée et classée.
 */
export interface AlternativeSimulee {
  candidat: CandidatPlacement;
  conflitsResiduels: Conflit[];
  score: number; // 0-100
  sousScores: CriteresClassement;
}

/**
 * Sous-scores de qualité (0-100 chacun), alignés sur le modèle du solveur CP-SAT.
 */
export interface CriteresClassement {
  continuite: number; // voisinage d'une séance du même enseignant/groupe
  heuresTardives: number; // éloignement des créneaux tardifs
  preferences: number; // respect des vœux et covoiturage
}

/**
 * Résultat de la simulation.
 */
export interface ResultatSimulation {
  alternatives: AlternativeSimulee[];
  message?: string; // explicatif quand la liste est vide
}
