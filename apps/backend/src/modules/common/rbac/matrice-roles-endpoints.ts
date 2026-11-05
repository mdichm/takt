// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { RoleCode } from '@takt/contracts';

/**
 * Matrice des autorisations par rôle pour les endpoints existants.
 * Cette documentation sert de référence pour l'implémentation des guards RBAC.
 *
 * Rôles :
 *  - admin : super-administrateur, accès à tout
 *  - gest  : gestionnaire, accès aux ressources de son département
 *  - rdep  : responsable département, lecture sur son département uniquement
 *  - dir   : directeur, lecture sur tous les départements
 *
 * Chaque entrée indique si le rôle est autorisé (true) ou non (false) sur l'endpoint.
 */
export const MATRICE_ROLES_ENDPOINTS: Record<
  string,
  Record<RoleCode, boolean>
> = {
  'GET /api/v1/users': {
    admin: true,
    gest: true,
    rdep: true,
    dir: true,
  },
  'GET /api/v1/users/:id': {
    admin: true,
    gest: true,
    rdep: true,
    dir: true,
  },
  'POST /api/v1/users': {
    admin: true,
    gest: true,
    rdep: false,
    dir: false,
  },
  'PATCH /api/v1/users/:id': {
    admin: true,
    gest: true,
    rdep: false,
    dir: false,
  },
  'DELETE /api/v1/users/:id': {
    admin: true,
    gest: false,
    rdep: false,
    dir: false,
  },
} as const;

export type EndpointAutorisation = keyof typeof MATRICE_ROLES_ENDPOINTS;
