// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type RoleCode, type ActionTransition, type TypeMotif } from '@takt/contracts';
import {
  type TransitionRegle,
  MATRICE_TRANSITIONS,
  REGLE_PAR_ACTION,
} from './workflow-matrix';

/** Résultat d’une évaluation de transition. */
export type TransitionResult =
  | { ok: true; regle: TransitionRegle }
  | { ok: false; raison: string; transitionsAutorisees?: readonly TransitionRegle[] };

/** Contexte d’évaluation d’une transition (données de la requête client). */
export interface TransitionContexte {
  /** Motif de rejet fourni par le client (obligatoire pour les rejets). */
  readonly motif?: string;
  /** Type de motif (obligatoire pour les rejets). */
  readonly typeMotif?: TypeMotif;
}

/**
 * Moteur pur de transitions de version.
 * Vérifie l’action, l’état source, le rôle et la garde de motif.
 * Ne modifie aucun état : pure fonction (testable unitairement sans DB).
 */
export function canTransition(
  etatSource: string,
  action: ActionTransition | string,
  role: RoleCode,
  contexte: TransitionContexte = {},
): TransitionResult {
  const regle = REGLE_PAR_ACTION.get(action);
  if (!regle) {
    return {
      ok: false,
      raison: `Action de transition inconnue : ${action}`,
      transitionsAutorisees: transitionsDepuis(etatSource),
    };
  }

  if (regle.from !== etatSource) {
    const depuis = transitionsDepuis(etatSource);
    return {
      ok: false,
      raison: `Transition '${action}' interdite depuis l'état '${etatSource}' (attendu : '${regle.from}')`,
      transitionsAutorisees: depuis,
    };
  }

  if (!regle.roles.includes(role)) {
    return {
      ok: false,
      raison: `Rôle '${role}' non autorisé pour la transition '${action}' depuis '${etatSource}'`,
      transitionsAutorisees: transitionsDepuis(etatSource),
    };
  }

  if (regle.motifObligatoire && (!contexte.motif || contexte.motif.trim().length === 0)) {
    return {
      ok: false,
      raison: `Un motif est obligatoire pour la transition '${action}'`,
      transitionsAutorisees: transitionsDepuis(etatSource),
    };
  }

  if (
    regle.motifObligatoire &&
    contexte.typeMotif === undefined
  ) {
    return {
      ok: false,
      raison: `Un type de motif est obligatoire pour la transition '${action}'`,
      transitionsAutorisees: transitionsDepuis(etatSource),
    };
  }

  return { ok: true, regle };
}

/** Liste des transitions autorisées depuis un état donné (pour le corps d’erreur 409). */
export function transitionsDepuis(etat: string): readonly TransitionRegle[] {
  return MATRICE_TRANSITIONS.filter((r) => r.from === etat);
}
