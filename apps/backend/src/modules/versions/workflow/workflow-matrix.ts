// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type RoleCode } from '@takt/contracts';

/**
 * Règle unique de la matrice de transitions du workflow de version.
 * 18 transitions arbitrées (cf. WORKFLOW_METIER §3, DL-TE-09, DL-WF-05/06).
 */
export interface TransitionRegle {
  /** Identifiant de l'action demandée par le client. */
  readonly action: string;
  /** État source requis. */
  readonly from: string;
  /** État cible atteint si la garde est satisfaite. */
  readonly to: string;
  /** Rôles autorisés à déclencher cette transition. */
  readonly roles: readonly RoleCode[];
  /** Condition de garde métier (documentaire). */
  readonly garde: string;
  /** Le motif de rejet est obligatoire pour cette action. */
  readonly motifObligatoire: boolean;
}

/** Matrice déclarative des 18 transitions autorisées. */
export const MATRICE_TRANSITIONS: readonly TransitionRegle[] = [
  {
    action: 'creerRepartition',
    from: 'initial',
    to: 'rep_pedag',
    roles: ['rdep'],
    garde: 'Année/semestre initialisée',
    motifObligatoire: false,
  },
  {
    action: 'annulerRepartition',
    from: 'rep_pedag',
    to: 'initial',
    roles: ['rdep'],
    garde: 'Aucune affectation validée',
    motifObligatoire: false,
  },
  {
    action: 'validerRepartition',
    from: 'rep_pedag',
    to: 'brouillon',
    roles: ['rdep'],
    garde: 'Répartition pédagogique validée sur son périmètre',
    motifObligatoire: false,
  },
  {
    action: 'lancerGeneration',
    from: 'brouillon',
    to: 'generation',
    roles: ['gest'],
    garde: 'Contraintes saisies, aucun verrou bloquant',
    motifObligatoire: false,
  },
  {
    action: 'editer',
    from: 'brouillon',
    to: 'edition',
    roles: ['gest'],
    garde: 'Aucune (saisie libre)',
    motifObligatoire: false,
  },
  {
    action: 'selectionnerScenario',
    from: 'generation',
    to: 'edition',
    roles: ['gest'],
    garde: '≥ 1 scénario généré (ou partiel avec avertissements)',
    motifObligatoire: false,
  },
  {
    action: 'annulerGeneration',
    from: 'generation',
    to: 'brouillon',
    roles: ['gest'],
    garde: 'Aucun scénario n’a été adopté',
    motifObligatoire: false,
  },
  {
    action: 'soumettreValidation',
    from: 'edition',
    to: 'valid_pedag',
    roles: ['gest'],
    garde: 'Verrous résolus, aucun conflit dur non résolu',
    motifObligatoire: false,
  },
  {
    action: 'regenerer',
    from: 'edition',
    to: 'generation',
    roles: ['gest'],
    garde: 'Nouveau snapshot des données pédagogiques',
    motifObligatoire: false,
  },
  {
    action: 'transmettreDirection',
    from: 'valid_pedag',
    to: 'valid_dir',
    roles: ['rdep'],
    garde: 'Validation départementale effectuée pour son périmètre',
    motifObligatoire: false,
  },
  {
    action: 'rejeterPedagogique',
    from: 'valid_pedag',
    to: 'edition',
    roles: ['rdep'],
    garde: 'Motif de rejet fourni',
    motifObligatoire: true,
  },
  {
    action: 'validerDefinitivement',
    from: 'valid_dir',
    to: 'valide',
    roles: ['dir'],
    garde: 'Tous départements concernés validés ; charge horaire OK',
    motifObligatoire: false,
  },
  {
    action: 'rejeterDirectionPedagogique',
    from: 'valid_dir',
    to: 'rep_pedag',
    roles: ['dir'],
    garde: 'Motif de rejet lié à la répartition pédagogique',
    motifObligatoire: true,
  },
  {
    action: 'rejeterDirectionPlanning',
    from: 'valid_dir',
    to: 'edition',
    roles: ['dir'],
    garde: 'Motif de rejet lié au planning seul',
    motifObligatoire: true,
  },
  {
    action: 'publier',
    from: 'valide',
    to: 'publie',
    roles: ['gest'],
    garde: 'Version immuable à partir de cet instant',
    motifObligatoire: false,
  },
  {
    action: 'archiverSansPublier',
    from: 'valide',
    to: 'archive',
    roles: ['dir'],
    garde: 'Aucune diffusion',
    motifObligatoire: false,
  },
  {
    action: 'archiver',
    from: 'publie',
    to: 'archive',
    roles: ['admin', 'gest'],
    garde: 'Ancienne version reste consultable',
    motifObligatoire: false,
  },
  {
    action: 'nouvelleVersionArchive',
    from: 'archive',
    to: 'initial',
    roles: ['gest'],
    garde: 'Nouvelle version basée sur l’archivée ; l’originale reste archivée',
    motifObligatoire: false,
  },
] as const;

/** Nombre de transitions canoniques (contrôle documentaire bloquant). */
export const NOMBRE_TRANSITIONS_ATTENDU = 18;

/** Map action → règle pour lookup O(1). */
export const REGLE_PAR_ACTION: ReadonlyMap<string, TransitionRegle> = new Map(
  MATRICE_TRANSITIONS.map((r) => [r.action, r]),
);

/**
 * Vérifie l’integrité de la matrice : nombre d’arêtes attendu et unicité des actions.
 * Lève si incohérence (utilisé au démarrage et en test).
 */
export function verifierMatrice(): void {
  if (MATRICE_TRANSITIONS.length !== NOMBRE_TRANSITIONS_ATTENDU) {
    throw new Error(
      `Matrice workflow incohérente : ${MATRICE_TRANSITIONS.length} transitions définies, ${NOMBRE_TRANSITIONS_ATTENDU} attendues`,
    );
  }
  const actions = MATRICE_TRANSITIONS.map((r) => r.action);
  const uniques = new Set(actions);
  if (uniques.size !== actions.length) {
    throw new Error(
      `Matrice workflow incohérente : actions dupliquées détectées (${actions.length} entrées, ${uniques.size} uniques)`,
    );
  }
  for (const r of MATRICE_TRANSITIONS) {
    if (!REGLE_PAR_ACTION.has(r.action)) {
      throw new Error(`Action non enregistrée dans la map : ${r.action}`);
    }
  }
}

verifierMatrice();
