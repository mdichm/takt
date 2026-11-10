// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Types du moteur de charge horaire — TAKT
 * Package pur, sans dépendance I/O (conforme TE-TEST-02, EX-PRI-05, DL-07).
 */

export type ModeArrondi = 'UNITAIRE' | 'DEMI_JOURNEE' | 'JOURNEE';

export type StatutCharge = 'CONFORME' | 'AVERTISSEMENT' | 'BLOQUANT';

export interface ChargeRuleSet {
  /** Identifiant unique (UUID). */
  id: string;
  /** Code logique du jeu de règles (ex: 'CHARG-STD'). */
  code: string;
  /** Libellé humain. */
  libelle: string;
  /** Numéro de version (incrémenté à chaque modification). */
  version: number;
  /** Indique si cette version est la version active. */
  estActive: boolean;
  /** Seuil d'alerte en pourcentage (ex: 90 = alerte si charge ≥ 90 % de la cible). */
  seuilAlerte: number;
  /** Plafond de charge hebdomadaire en heures (dépassement = BLOQUANT). */
  plafondHebdomadaire: number;
  /** Mode d'arrondi à appliquer sur la charge hebdomadaire. */
  arrondi: ModeArrondi;
  /** Durée d'une journée en heures (pour arrondi JOURNEE). */
  dureeJournee: number;
  /** Durée d'une demi-journée en heures (pour arrondi DEMI_JOURNEE). */
  dureeDemiJournee: number;
  /** Coefficients par code de type d'enseignement (ex: { CM: 1.5, TD: 1, TP: 1 }). */
  coefficientsParTypeEnseignement: Record<string, number>;
  /** Cible hebdomadaire par code de grade (ex: { MCF: 19, PR: 19, ATER: 19 }). */
  cibleHebdomadaireParGrade: Record<string, number>;
  /** Tolérance d'équilibrage intra-département (écart max-min autorisé en heures). */
  toleranceEquilibrage: number;
  /** Date de création. */
  createdAt: Date;
  /** Date de dernière modification. */
  updatedAt: Date;
}

/**
 * Affectation pédagogique utilisée comme entrée du calcul de charge.
 * Correspond aux champs pertinents de AffectationPedagogique enrichis du grade et type d'enseignement.
 */
export interface AffectationCharge {
  /** Identifiant unique de l'affectation. */
  id: string;
  /** Identifiant de l'enseignant. */
  enseignantId: string;
  /** Identifiant du département. */
  departementId: string;
  /** Code du grade de l'enseignant (optionnel si non renseigné). */
  gradeCode?: string;
  /** Code du type d'enseignement (optionnel si non renseigné). */
  typeEnseignementCode?: string;
  /** Volume horaire hebdomadaire brut (avant coefficient). */
  volumeHebdo: number;
}

/**
 * Résultat du calcul de charge pour un enseignant.
 */
export interface ChargeEnseignant {
  /** Identifiant de l'enseignant. */
  enseignantId: string;
  /** Charge brute (somme des volumes × coefficients). */
  chargeBrute: number;
  /** Charge après arrondi selon le mode configuré. */
  chargeArrondie: number;
  /** Cible hebdomadaire applicable (d'après le grade). */
  cible: number;
  /** Taux de charge en pourcentage (chargeArrondie / cible × 100). */
  taux: number;
  /** Indique si le plafond est dépassé (chargeArrondie > plafondHebdomadaire). */
  depassePlafond: boolean;
  /** Statut global de la charge de l'enseignant. */
  statut: StatutCharge;
}

/**
 * Résultat du calcul de charge pour un département.
 */
export interface ChargeDepartement {
  /** Identifiant du département. */
  departementId: string;
  /** Charge totale du département (somme des charges arrondies). */
  totalCharge: number;
  /** Charge moyenne par enseignant du département. */
  moyenne: number;
  /** Charge maximale d'un enseignant du département. */
  max: number;
  /** Charge minimale d'un enseignant du département. */
  min: number;
  /** Écart entre max et min (mesure de l'équilibrage). */
  ecart: number;
  /** Nombre d'enseignants dans le département. */
  nombreEnseignants: number;
}

/**
 * Alerte générée lors du calcul de charge.
 */
export interface AlerteCharge {
  /** Type d'alerte. */
  type: 'SEUIL_ALERTE' | 'DEPASSEMENT_PLAFOND' | 'ECART_EQUILIBRAGE' | 'CIBLE_ABSENTE' | 'COEFFICIENT_INCONNU';
  /** Sévérité de l'alerte. */
  severite: 'AVERTISSEMENT' | 'BLOQUANT';
  /** Identifiant de l'enseignant concerné (si applicable). */
  enseignantId?: string;
  /** Identifiant du département concerné (si applicable). */
  departementId?: string;
  /** Message descriptif. */
  message: string;
  /** Détails techniques (valeurs impliquées). */
  details: Record<string, unknown>;
}

/**
 * Résultat global du calcul de charge.
 */
export interface ResultatCalculCharge {
  /** Charges par enseignant. */
  parEnseignant: ChargeEnseignant[];
  /** Charges agrégées par département. */
  parDepartement: ChargeDepartement[];
  /** Taux de dépassement global (pourcentage d'enseignants en dépassement de plafond). */
  tauxDepassement: number;
  /** Écarts d'équilibrage par département. */
  ecartsEquilibrage: Array<{ departementId: string; ecart: number; depasseTolerance: boolean }>;
  /** Liste des alertes générées. */
  alertes: AlerteCharge[];
}