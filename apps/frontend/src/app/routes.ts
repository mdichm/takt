// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { lazy } from 'react';
import type { RoleCode } from '@takt/contracts';

/** Définition d une route de l application (UI_FRONTEND_SPECS §5). */
export interface RouteDef {
  /** Code stable de l écran EC-*. */
  code: string;
  /** Chemin URL de la route. */
  chemin: string;
  /** Rôle(s) autorisé(s) à accéder à la route. */
  roles: RoleCode[];
  /** Vrai si la route requiert un périmètre département (RB-UI-01, rdep). */
  departement?: boolean;
  /** Vrai si la route requiert un bail d édition acquis. */
  editionLock?: boolean;
  /** Vrai si l écran apparaît dans la sidebar (false = écran de connexion). */
  sidebar?: boolean;
  /** Composant chargé paresseusement. */
  composant: ReturnType<typeof lazy>;
}

function page(code: string): ReturnType<typeof lazy> {
  return lazy(() => import(`./pages/${code}.tsx`));
}

/** Redirection par défaut après authentification ou accès refusé, par rôle. */
export const REDIRECTION_PAR_DEFAUT: Record<RoleCode, string> = {
  admin: '/admin/users',
  gest: '/ges/init',
  rdep: '/rdep/allocation',
  dir: '/dir/scenario',
};

/**
 * Table unique des 29 routes de l application.
 *
 * Source : UI_FRONTEND_SPECS §5 + UI_ARBORESCENCE (§2 à §6).
 * Nombre d écrans : 3 transversaux + 4 admin + 12 gest + 5 rdep + 5 dir = 29.
 */
export const ROUTES: RouteDef[] = [
  // --- Écrans transversaux (3) ---
  {
    code: 'EC-COM-01',
    chemin: '/login',
    roles: ['admin', 'gest', 'rdep', 'dir'],
    sidebar: false,
    composant: page('EC-COM-01'),
  },
  {
    code: 'EC-COM-02',
    chemin: '/dashboard',
    roles: ['admin', 'gest', 'rdep', 'dir'],
    sidebar: true,
    composant: page('EC-COM-02'),
  },
  {
    code: 'EC-COM-03',
    chemin: '/profile',
    roles: ['admin', 'gest', 'rdep', 'dir'],
    sidebar: true,
    composant: page('EC-COM-03'),
  },

  // --- Écrans Administrateur (4) ---
  {
    code: 'EC-ADM-01',
    chemin: '/admin/users',
    roles: ['admin'],
    sidebar: true,
    composant: page('EC-ADM-01'),
  },
  {
    code: 'EC-ADM-02',
    chemin: '/admin/referentiels',
    roles: ['admin'],
    sidebar: true,
    composant: page('EC-ADM-02'),
  },
  {
    code: 'EC-ADM-03',
    chemin: '/admin/params',
    roles: ['admin'],
    sidebar: true,
    composant: page('EC-ADM-03'),
  },
  {
    code: 'EC-ADM-04',
    chemin: '/admin/audit',
    roles: ['admin'],
    sidebar: true,
    composant: page('EC-ADM-04'),
  },

  // --- Écrans Gestionnaire (12) ---
  {
    code: 'EC-GES-01',
    chemin: '/ges/init',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-01'),
  },
  {
    code: 'EC-GES-02',
    chemin: '/ges/plans',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-02'),
  },
  {
    code: 'EC-GES-03',
    chemin: '/ges/constraints',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-03'),
  },
  {
    code: 'EC-GES-04',
    chemin: '/ges/generate',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-04'),
  },
  {
    code: 'EC-GES-05',
    chemin: '/ges/scenarios',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-05'),
  },
  {
    code: 'EC-GES-06',
    chemin: '/ges/edt',
    roles: ['gest'],
    editionLock: true,
    sidebar: true,
    composant: page('EC-GES-06'),
  },
  {
    code: 'EC-GES-07',
    chemin: '/ges/conflicts',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-07'),
  },
  {
    code: 'EC-GES-08',
    chemin: '/ges/submit',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-08'),
  },
  {
    code: 'EC-GES-09',
    chemin: '/ges/publish',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-09'),
  },
  {
    code: 'EC-GES-10',
    chemin: '/ges/archive',
    roles: ['gest', 'admin'],
    sidebar: true,
    composant: page('EC-GES-10'),
  },
  {
    code: 'EC-GES-11',
    chemin: '/ges/exports',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-11'),
  },
  {
    code: 'EC-GES-12',
    chemin: '/ges/locks',
    roles: ['gest'],
    sidebar: true,
    composant: page('EC-GES-12'),
  },

  // --- Écrans Responsable de département (5) ---
  {
    code: 'EC-RDEP-01',
    chemin: '/rdep/allocation',
    roles: ['rdep'],
    departement: true,
    sidebar: true,
    composant: page('EC-RDEP-01'),
  },
  {
    code: 'EC-RDEP-02',
    chemin: '/rdep/charges',
    roles: ['rdep'],
    departement: true,
    sidebar: true,
    composant: page('EC-RDEP-02'),
  },
  {
    code: 'EC-RDEP-03',
    chemin: '/rdep/validate',
    roles: ['rdep'],
    sidebar: true,
    composant: page('EC-RDEP-03'),
  },
  {
    code: 'EC-RDEP-04',
    chemin: '/rdep/revalidate',
    roles: ['rdep'],
    sidebar: true,
    composant: page('EC-RDEP-04'),
  },
  {
    code: 'EC-RDEP-05',
    chemin: '/rdep/consult',
    roles: ['rdep'],
    sidebar: true,
    composant: page('EC-RDEP-05'),
  },

  // --- Écrans Direction (5) ---
  {
    code: 'EC-DIR-01',
    chemin: '/dir/scenario',
    roles: ['dir'],
    sidebar: true,
    composant: page('EC-DIR-01'),
  },
  {
    code: 'EC-DIR-02',
    chemin: '/dir/decision',
    roles: ['dir'],
    sidebar: true,
    composant: page('EC-DIR-02'),
  },
  {
    code: 'EC-DIR-03',
    chemin: '/dir/reject',
    roles: ['dir'],
    sidebar: true,
    composant: page('EC-DIR-03'),
  },
  {
    code: 'EC-DIR-04',
    chemin: '/dir/archive',
    roles: ['dir'],
    sidebar: true,
    composant: page('EC-DIR-04'),
  },
  {
    code: 'EC-DIR-05',
    chemin: '/dir/exports',
    roles: ['dir'],
    sidebar: true,
    composant: page('EC-DIR-05'),
  },
];
