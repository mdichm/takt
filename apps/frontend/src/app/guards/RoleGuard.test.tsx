// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleGuard } from './RoleGuard';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

const Cible = () => <div data-testid="page-cible">Cible</div>;
const GesInit = () => <div data-testid="page-ges-init">Ges init</div>;

function sessionUtilisateur(role: string): SessionUtilisateur {
  return {
    id: 'u1',
    email: 'utilisateur@example.takt',
    nom: 'Nom',
    prenom: 'Prenom',
    role: role as SessionUtilisateur['role'],
    departementIds: [],
  };
}

function monter({ roles, session }: { roles: string[]; session: SessionUtilisateur | null }) {
  if (session) {
    userStore.setState({ session, estAuthentifie: true });
  } else {
    userStore.setState({ session: null, estAuthentifie: false });
  }
  return render(
    <MemoryRouter initialEntries={['/cible']}>
      <Routes>
        <Route path="/ges/init" element={<GesInit />} />
        <Route
          path="/cible"
          element={
            <RoleGuard roles={roles as SessionUtilisateur['role'][]}>
              <Cible />
            </RoleGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});
afterEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});

describe('RoleGuard', () => {
  it('rend rien quand non authentifié', () => {
    monter({ roles: ['admin'], session: null });
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });

  it('rend la cible quand le rôle est autorisé', () => {
    monter({ roles: ['admin'], session: sessionUtilisateur('admin') });
    expect(screen.getByTestId('page-cible')).toBeInTheDocument();
  });

  it('redirige vers l écran par défaut quand le rôle est non autorisé', () => {
    monter({ roles: ['admin'], session: sessionUtilisateur('gest') });
    expect(screen.getByTestId('page-ges-init')).toBeInTheDocument();
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });
});
