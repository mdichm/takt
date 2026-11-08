// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { EtatVersion, RoleCode } from '@takt/contracts';
import type { Permissions } from './types';

const ETATS_MODIFIABLES = ['initial', 'rep_pedag', 'brouillon', 'edition'] as const;

/**
 * Matrice des permissions ST_TAKT §5.2-5.3 (RBAC par rôle + portée département).
 *
 * Règles applicables :
 * - `publie` est immuable pour tous (seule transition publie -> archive, GG-09).
 * - `archive` n'est lisible ni réactivable que par un administrateur.
 * - L'édition d'une version modifiable requiert le rôle admin ou la portée
 *   département du demandeur.
 * - La génération est réservée au gestionnaire pédagogique (`gest`).
 * - Le forçage de verrou et la réactivation d'archive sont réservés à `admin`.
 */
export function calculerPermissions(
  etat: EtatVersion | null,
  role: RoleCode,
  estProprietaireDepartement = false,
): Permissions {
  const modifiable =
    etat !== null && ETATS_MODIFIABLES.includes(etat as (typeof ETATS_MODIFIABLES)[number]);

  return {
    peutLire: etat !== null && (etat !== 'archive' || role === 'admin'),
    peutEditer: modifiable && (role === 'admin' || estProprietaireDepartement),
    peutGenerer: role === 'gest' && modifiable,
    peutVerrouiller: modifiable,
    peutForcerVerrou: role === 'admin',
    peutReactiverArchive: role === 'admin' && etat === 'archive',
    peutGererDepartement: role === 'admin' || role === 'dir',
  };
}

/** Permissions par défaut quand aucune version n'est sélectionnée. */
export const PERMISSIONS_VIDES: Permissions = {
  peutLire: false,
  peutEditer: false,
  peutGenerer: false,
  peutVerrouiller: false,
  peutForcerVerrou: false,
  peutReactiverArchive: false,
  peutGererDepartement: false,
};
