// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Routes,
  Route,
} from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

const Connexion = () => <div data-testid="page-login">Connexion</div>;
const Cible = () => <div data-testid="page-cible">Cible</div>;
const GesInit = () => <div data-testid="page-ges-init">Ges init</div>;
const RdepAlloc = () => <div data-testid="page-rdep-alloc">Rdep allocation</div>;
const DirScenario = () => <div data-testid="page-dir-scenario">Dir scenario</div>;

function sessionUtilisateur(role: string, departementIds: string[] = []): SessionUtilisateur {
  return {
    id: 'u1',
    email: 'utilisateur@example.takt',
    nom: 'Nom',
    prenom: 'Prenom',
    role: role as SessionUtilisateur['role'],
    departementIds,
  };
}

function monter({
  roles,
  departement,
  session,
}: {
  roles?: string[];
  departement?: boolean;
  session: SessionUtilisateur | null;
}) {
  if (session) {
    userStore.setState({ session, estAuthentifie: true });
  } else {
    userStore.setState({ session: null, estAuthentifie: false });
  }
  return render(
    <MemoryRouter initialEntries={['/cible']}>
      <Routes>
        <Route path="/login" element={<Connexion />} />
        <Route path="/ges/init" element={<GesInit />} />
        <Route path="/dir/scenario" element={<DirScenario />} />
        <Route path="/rdep/allocation" element={<RdepAlloc />} />
        <Route
          path="/cible"
          element={
            <ProtectedRoute
              roles={roles ?? ['admin']}
              departement={departement ?? false}
            >
              <Cible />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});
afterEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});

describe('ProtectedRoute (AuthGuard + RoleGuard)', () => {
  it('redirige vers /login quand l utilisateur n est pas authentifié', () => {
    monter({ session: null });
    expect(screen.getByTestId('page-login')).toBeInTheDocument();
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });

  it('rend la cible quand authentifié et rôle autorisé', () => {
    monter({
      session: sessionUtilisateur('admin'),
      roles: ['admin'],
    });
    expect(screen.getByTestId('page-cible')).toBeInTheDocument();
  });

  it('redirige vers l écran par défaut quand le rôle est non autorisé', () => {
    // un gest sur une route admin -> redirige vers /ges/init
    monter({
      session: sessionUtilisateur('gest'),
      roles: ['admin'],
    });
    expect(screen.getByTestId('page-ges-init')).toBeInTheDocument();
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });

  it('redirige un rdep vers son écran par défaut sur une route admin', () => {
    monter({
      session: sessionUtilisateur('rdep'),
      roles: ['admin'],
    });
    expect(screen.getByTestId('page-rdep-alloc')).toBeInTheDocument();
  });

  it('redirige un dir vers son écran par défaut sur une route gest', () => {
    monter({
      session: sessionUtilisateur('dir'),
      roles: ['gest'],
    });
    expect(screen.getByTestId('page-dir-scenario')).toBeInTheDocument();
  });

  it('laisse passer tous les rôles sur les écrans transversaux', () => {
    for (const role of ['admin', 'gest', 'rdep', 'dir']) {
      monter({
        session: sessionUtilisateur(role),
        roles: ['admin', 'gest', 'rdep', 'dir'],
      });
      expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
    }
  });
});

describe('DepartmentGuard (RB-UI-01)', () => {
  it('bloque un rdep sans périmètre département sur une route à portée département', () => {
    monter({
      session: sessionUtilisateur('rdep', []),
      roles: ['rdep'],
      departement: true,
    });
    expect(screen.getByTestId('page-login')).toBeInTheDocument();
  });

  it('laisse passer un rdep avec périmètre département', () => {
    monter({
      session: sessionUtilisateur('rdep', ['dep-1']),
      roles: ['rdep'],
      departement: true,
    });
    expect(screen.getByTestId('page-cible')).toBeInTheDocument();
  });
});

