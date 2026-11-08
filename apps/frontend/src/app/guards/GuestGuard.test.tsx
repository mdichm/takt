// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuestGuard } from './GuestGuard';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

const Cible = () => <div data-testid="page-cible">Cible</div>;
const Dashboard = () => <div data-testid="page-dashboard">Dashboard</div>;

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

function monter({ session }: { session: SessionUtilisateur | null }) {
  if (session) {
    userStore.setState({ session, estAuthentifie: true });
  } else {
    userStore.setState({ session: null, estAuthentifie: false });
  }
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/login"
          element={
            <GuestGuard>
              <Cible />
            </GuestGuard>
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

describe('GuestGuard', () => {
  it('rend la cible quand non authentifié', () => {
    monter({ session: null });
    expect(screen.getByTestId('page-cible')).toBeInTheDocument();
  });

  it('redirige vers /dashboard quand déjà authentifié', () => {
    monter({ session: sessionUtilisateur('admin') });
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('page-cible')).not.toBeInTheDocument();
  });
});
