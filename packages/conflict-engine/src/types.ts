// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Types du moteur de conflits — TAKT
 * Package pur, déterministe, sans dépendance I/O (conforme TE-TEST-02, EX-PRI-05, DL-07).
 */

/** Codes de type de conflit détectés par le moteur. */
export type TypeConflit =
  | 'ENSEIGNANT'
  | 'GROUPE'
  | 'SALLE'
  | 'CAPACITE'
  | 'EQUIPEMENT'
  | 'COMPATIBILITE'
  | 'INDISPONIBILITE'
  | 'PAUSE'
  | 'REGLE_PEDAGOGIQUE'
  | 'VERROU'
  | 'COVOITURAGE'
  | 'VOEU'
  | 'DONNEE_MANQUANTE';

/** Ensemble ordonné des codes de type de conflit (utilisé pour le tri déterministe des sorties). */
export const TYPES_CONFLIT: TypeConflit[] = [
  'ENSEIGNANT',
  'GROUPE',
  'SALLE',
  'CAPACITE',
  'EQUIPEMENT',
  'COMPATIBILITE',
  'INDISPONIBILITE',
  'PAUSE',
  'REGLE_PEDAGOGIQUE',
  'VERROU',
  'COVOITURAGE',
  'VOEU',
  'DONNEE_MANQUANTE',
];

/** Sévérité d'un conflit. */
export type SeveriteConflit = 'BLOQUANT' | 'AVERTISSEMENT' | 'INFORMATION';

/** Sévérités par défaut associées à chaque type de conflit (décrit dans le README). */
export const SEVERITE_PAR_DEFAUT: Record<TypeConflit, SeveriteConflit> = {
  ENSEIGNANT: 'BLOQUANT',
  GROUPE: 'BLOQUANT',
  SALLE: 'BLOQUANT',
  CAPACITE: 'BLOQUANT',
  EQUIPEMENT: 'AVERTISSEMENT',
  COMPATIBILITE: 'AVERTISSEMENT',
  INDISPONIBILITE: 'BLOQUANT',
  PAUSE: 'AVERTISSEMENT',
  REGLE_PEDAGOGIQUE: 'INFORMATION',
  VERROU: 'BLOQUANT',
  COVOITURAGE: 'INFORMATION',
  VOEU: 'AVERTISSEMENT',
  DONNEE_MANQUANTE: 'AVERTISSEMENT',
};

/** Un conflit détecté par le moteur. */
export interface Conflit {
  /** Type du conflit. */
  type: TypeConflit;
  /** Sévérité du conflit. */
  severite: SeveriteConflit;
  /** Message descriptif lisible par un humain. */
  message: string;
  /** Détails techniques (valeurs impliquées, identifiants des entités en cause). */
  details: Record<string, unknown>;
}

/**
 * Séance à analyser. Représente une séance de cours (créneau récurrent) sur un jour donné.
 */
export interface SeanceAAnalyser {
  /** Identifiant unique de la séance. */
  id: string;
  /** Identifiant de la version de planning. */
  versionId: string;
  /** Date du jour de la séance (UTC, début de journée). */
  jour: Date;
  /** Identifiant du créneau de début. */
  creneauDebutId: string;
  /** Nombre de créneaux consécutifs occupés (défaut 1). */
  nbCreneaux?: number;
  /** Identifiant de la salle affectée (optionnel). */
  salleId?: string;
  /** Identifiant de l'enseignant affecté (optionnel). */
  enseignantId?: string;
  /** Identifiant du groupe d'étudiants affecté (optionnel). */
  groupeId?: string;
  /** Code de l'activité ou type d'enseignement (optionnel, utilisé pour la compatibilité salle). */
  activite?: string;
  /** Codes des équipements requis par la séance (optionnel). */
  equipementsRequises?: string[];
}

/**
 * Une séance concurrente (déjà placée) utilisée pour la détection de conflits de ressource.
 */
export interface SeanceConcurrente {
  id: string;
  jour: Date;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId?: string;
  enseignantId?: string;
  groupeId?: string;
}

/**
 * Informations sur une salle connues du moteur.
 */
export interface SalleConflit {
  id: string;
  capacite: number;
  typeSalleId?: string;
  equipements: string[]; // codes d'équipements présents dans la salle
}

/**
 * Informations sur un groupe connues du moteur.
 */
export interface GroupeConflit {
  id: string;
  effectif?: number; // nombre d'étudiants (optionnel → pas de contrôle de capacité si absent)
}

/**
 * Informations sur un enseignant connues du moteur.
 */
export interface EnseignantConflit {
  id: string;
  indisponibilites?: Date[]; // plages d'indisponibilité connues (début de plage)
}

/**
 * Un verrou posé sur une séance (modèle VerrouSeance).
 */
export interface VerrouConflit {
  id: string;
  seanceId?: string; // verrou lié à une séance précise
  type: 'CRENEAU' | 'SALLE' | 'ENSEIGNANT' | 'ACTIVITE';
  valeur: string;
  poids: number;
}

/**
 * Une règle pédagogique à vérifier.
 */
export interface ReglePedagogique {
  id: string;
  libelle: string;
  severite: SeveriteConflit;
  estRespectee: boolean;
  details?: Record<string, unknown>;
}

/**
 * Périodes de pause (déconseil ou interdiction de placement sur certains créneaux).
 */
export interface PeriodePause {
  nom: string;
  creneaux: string[]; // IDs des créneaux concernés par la pause
}

/**
 * Contexte d'exécution fourni au moteur de conflits.
 * Toutes les données sont en mémoire ; le moteur ne fait aucune I/O.
 */
export interface ContexteConflits {
  /** Séances déjà placées sur la même version (pour détection de conflits de ressource). */
  seancesConcurrentes: SeanceConcurrente[];
  /** Salle affectée à la séance analysée (optionnel). */
  salle?: SalleConflit;
  /** Groupe affecté à la séance analysée (optionnel). */
  groupe?: GroupeConflit;
  /** Enseignant affecté à la séance analysée (optionnel). */
  enseignant?: EnseignantConflit;
  /** Identifiants des contraintes d'indisponibilité actives sur la version. */
  contraintesIndisponibilite: string[];
  /** Verrous posés sur la version / séance. */
  verrous: VerrouConflit[];
  /** Règles pédagogiques à vérifier. */
  reglesPedagogiques: ReglePedagogique[];
  /** Périodes de pause. */
  pauses: PeriodePause[];
  /** Liste ordonnée des IDs de créneaux de la journée (pour calcul de chevauchement). */
  creneauxOrdonnees: string[];
  /** Durée d'un créneau en minutes (défaut 60). */
  pasDeTempsMinutes?: number;
  /** Seuil de marge de capacité (défaut 1.1 = 10 %). La capacité doit être ≥ effectif × margeCapacite. */
  margeCapacite?: number;
  /** Mapping code type d'enseignement → codes de types de salle acceptés (compatibilité). */
  typesSalleCompatibles?: Record<string, string[]>;
  /** Préférences / vœux de l'enseignant (optionnel). */
  voeux?: { creneauxIndesirables: string[] };
  /** Informations de covoiturage (optionnel). */
  covoiturage?: { actif: boolean; compatible: boolean };
}
