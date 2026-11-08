// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DepartmentGuard } from './DepartmentGuard';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

const Cible = () => <div data-testid="page-cible">Cible</div>;
const Connexion = () => <div data-testid="page-login">Connexion</div>;

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

function monter({ session }: { session: SessionUtilisateur | null }) {
  if (session) {
    userStore.setState({ session, estAuthentifie: true });
  } else {
    userStore.setState({ session: null, estAuthentifie: false });
  }
  return render(
    <MemoryRouter initialEntries={['/cible']}>
      <Routes>
        <Route path="/login" element={<Connexion />} />
        <Route
          path="/cible"
          element={
            <DepartmentGuard>
              <Cible />
            </DepartmentGuard>
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

describe('DepartmentGuard (RB-UI-01)', () => {
  it('rend rien quand non authentifié', () => {
    monter({ session: null });
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });

  it('redirige vers /login quand le périmètre département est absent', () => {
    monter({ session: sessionUtilisateur('rdep', []) });
    expect(screen.getByTestId('page-login')).toBeInTheDocument();
  });

  it('rend la cible quand le périmètre département est présent', () => {
    monter({ session: sessionUtilisateur('rdep', ['dep-1']) });
    expect(screen.getByTestId('page-cible')).toBeInTheDocument();
  });
});
