// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import { userStore } from '@/stores/userStore';
import { themeStore } from '@/app/theme/themeStore';
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
  localStorage.removeItem('takt-theme');
  themeStore.setState({ theme: 'normal' });
});
afterEach(() => {
  cleanup();
  userStore.setState({ session: null, estAuthentifie: false });
});

function monter() {
  userStore.setState({ session: sessionAdmin, estAuthentifie: true });
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe('Header', () => {
  it('affiche l utilisateur, le switch de thème et la déconnexion', () => {
    monter();
    expect(screen.getByTestId('header-utilisateur')).toHaveTextContent('Jean Dupont');
    expect(screen.getByTestId('theme-switch')).toBeInTheDocument();
    expect(screen.getByTestId('deconnexion')).toBeInTheDocument();
  });

  it('passe le thème en ramadan au clic sur le switch', () => {
    monter();
    fireEvent.click(screen.getByTestId('theme-switch'));
    expect(themeStore.getState().theme).toBe('ramadan');
    expect(screen.getByTestId('theme-switch')).toHaveTextContent('Passer en Normal');
  });
});
