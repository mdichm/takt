// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { NavLink } from 'react-router-dom';
import { userStore } from '@/stores/userStore';
import { ROUTES } from '@/app/routes';

/**
 * Barre latérale de navigation filtrée par rôle de l utilisateur connecté.
 * Seuls les écrans dont le rôle est autorisé (et marqués sidebar) s affichent.
 * L écran de connexion (EC-COM-01) est exclu de la sidebar.
 */
export function Sidebar(): JSX.Element | null {
  const { session, estAuthentifie } = userStore((state) => ({
    session: state.session,
    estAuthentifie: state.estAuthentifie,
  }));

  if (!estAuthentifie || !session) {
    return null;
  }

  const entrees = ROUTES.filter(
    (route) => route.sidebar !== false && route.roles.includes(session.role)
  );

  return (
    <nav data-testid="sidebar" aria-label="Navigation principale">
      {entrees.map((route) => (
        <NavLink
          key={route.code}
          to={route.chemin}
          data-testid={`sidebar-entry-${route.code}`}
        >
          {route.code}
        </NavLink>
      ))}
    </nav>
  );
}
