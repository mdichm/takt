// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/templates/Layout/Layout';
import { PageIntrouvable } from '@/app/components/PageIntrouvable';
import { Chargement } from '@/app/components/Chargement';
import { GuestGuard } from '@/app/guards';
import { ProtectedRoute } from '@/app/guards';
import { ROUTES } from '@/app/routes';

/**
 * Routeur de l application.
 *
 * Structure :
 * - Une route de mise en page (pathless) enveloppe toutes les pages dans le
 *   Layout (sidebar + header + Outlet), de sorte que la navigation conserve
 *   le shell applicatif.
 * - Toutes ces routes sont protegees par ProtectedRoute (AuthGuard +
 *   RoleGuard + DepartmentGuard).
 * - / redirige vers le tableau de bord ; /login est protege par GuestGuard.
 * - Les pages sont chargees paresseusement (React.lazy + Suspense).
 * - Les routes inconnues renvoient sur la page 404.
 */
export function Router(): JSX.Element {
  const PageLogin = ROUTES.find((r) => r.chemin === '/login')!.composant;

  return (
    <BrowserRouter>
      <Suspense fallback={<Chargement />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/login"
              element={
                <GuestGuard>
                  <PageLogin />
                </GuestGuard>
              }
            />
            {ROUTES.filter((r) => r.chemin !== '/login').map((route) => (
              <Route
                key={route.code}
                path={route.chemin}
                element={
                  <ProtectedRoute roles={route.roles} departement={route.departement ?? false}>
                    <route.composant />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<PageIntrouvable />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default Router;
