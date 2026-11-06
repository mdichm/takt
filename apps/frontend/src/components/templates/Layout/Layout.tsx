// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Header } from '@/components/templates/Header/Header';
import { Sidebar } from '@/components/templates/Sidebar/Sidebar';

/**
 * Mise en page commune : barre latérale filtrée par rôle, header (profil,
 * switch de thème, déconnexion) et zone de contenu où s injectent les pages
 * protégées (Outlet).
 */
export function Layout(): JSX.Element {
  return (
    <div className="layout" data-testid="layout">
      <aside data-testid="sidebar-container">
        <Sidebar />
      </aside>
      <main className="layout__main">
        <Header />
        <section data-testid="layout-contenu">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
}
