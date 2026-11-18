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

/*──────────────────────────────────────────────────────────────────────────────
  Types du contrôle de couverture pédagogique (TAKT-L06-09)
  ─────────────────────────────────────────────────────────────────────────────*/

/** Statut de couverture d'une affectation pédagogique. */
export type StatutCouverture = 'CONFORME' | 'SOUS_PLANIFICATION' | 'SUR_PLANIFICATION';

/** Affectation pédagogique réduite aux champs nécessaires au calcul de couverture. */
export interface AffectationCouverture {
  /** Identifiant de l'affectation. */
  id: string;
  /** Identifiant du département. */
  departementId: string;
  /** Volume horaire hebdomadaire déclaré (heures, strictement positif). */
  volumeHebdo: number;
}

/** Séance réduite aux champs nécessaires au calcul de couverture. */
export interface SeanceCouverture {
  /** Identifiant de la séance. */
  id: string;
  /** Identifiant de l'affectation à laquelle la séance est liée. */
  affectationId: string;
  /** Nombre de créneaux consécutifs (≥ 1). */
  nbCreneaux: number;
  /** Durée d'un créneau en minutes (défaut 30, source Creneau.dureeMinutes). */
  dureeCreneauMinutes: number;
}

/** Résultat de couverture pour une affectation pédagogique. */
export interface CouvertureAffectation {
  /** Identifiant de l'affectation. */
  affectationId: string;
  /** Identifiant du département. */
  departementId: string;
  /** Volume horaire déclaré en minutes (volumeHebdo × 60). */
  volumeDeclareMinutes: number;
  /** Volume horaire planifié en minutes (somme nbCreneaux × dureeCreneauMinutes). */
  volumePlanifieMinutes: number;
  /** Taux de couverture en pourcentage (0 à 100+). */
  taux: number;
  /** Statut de couverture. */
  statut: StatutCouverture;
}

/** Résultat de couverture agrégé par département. */
export interface CouvertureDepartement {
  /** Identifiant du département. */
  departementId: string;
  /** Volume horaire déclaré en minutes. */
  volumeDeclareMinutes: number;
  /** Volume horaire planifié en minutes. */
  volumePlanifieMinutes: number;
  /** Taux de couverture du département en pourcentage. */
  taux: number;
}

/** Résultat global du calcul de couverture pédagogique. */
export interface ResultatCouverture {
  /** Détail de couverture par affectation. */
  parAffectation: CouvertureAffectation[];
  /** Détail de couverture agrégé par département. */
  parDepartement: CouvertureDepartement[];
  /** Taux de couverture global (volume planifié total / volume déclaré total). */
  tauxGlobal: number;
  /** Vrai si couverture exactement 100 % sur toutes les affectations et aucune séance orpheline. */
  estConforme: boolean;
  /** Identifiants des séances liées à une affectation inconnue (orphelines, bloquant). */
  seancesOrphelines: string[];
}