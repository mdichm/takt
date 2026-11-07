// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  MemoryRouter,
  Routes,
  Route,
} from 'react-router-dom';
import { Layout } from './Layout';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

const sessionAdmin: SessionUtilisateur = {
  id: 'u1',
  email: 'jean.dupont@example.takt',
  nom: 'Dupont',
  prenom: 'Jean',
  role: 'admin',
  departementIds: [],
};

beforeEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});
afterEach(() => {
  cleanup();
  userStore.setState({ session: null, estAuthentifie: false });
});

function monter() {
  userStore.setState({ session: sessionAdmin, estAuthentifie: true });
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div data-testid="contenu">Contenu par défaut</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  it('rend la sidebar, le header et le contenu de la sortie (Outlet)', () => {
    monter();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('contenu')).toBeInTheDocument();
    // un admin voit EC-ADM-01 dans la sidebar
    expect(screen.getByTestId('sidebar-entry-EC-ADM-01')).toBeInTheDocument();
  });
});
