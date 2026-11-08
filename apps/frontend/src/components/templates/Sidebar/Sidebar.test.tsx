// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { userStore } from '@/stores/userStore';
import type { SessionUtilisateur } from '@/stores/types';

function sessionUtilisateur(role: SessionUtilisateur['role']): SessionUtilisateur {
  return {
    id: 'u1',
    email: 'utilisateur@example.takt',
    nom: 'Nom',
    prenom: 'Prenom',
    role,
    departementIds: [],
  };
}

beforeEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});
afterEach(() => {
  userStore.setState({ session: null, estAuthentifie: false });
});

describe('Sidebar (filtrage par rôle, UI_ARBORESCENCE §1)', () => {
  function monter(role: SessionUtilisateur['role'] | null) {
    userStore.setState({ session: role ? sessionUtilisateur(role) : null, estAuthentifie: !!role });
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>,
    );
  }

  it('admin voit 7 entrées : 4 dédiés admin + EC-GES-10 partagé + 2 transversaux', () => {
    const { container } = monter('admin');
    const entries = container.querySelectorAll('[data-testid^="sidebar-entry-"]');
    expect(entries).toHaveLength(7);
    expect(screen.getByTestId('sidebar-entry-EC-ADM-01')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-entry-EC-GES-10')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-entry-EC-COM-02')).toBeInTheDocument();
  });

  it('gest voit 14 entrées : 12 dédiés gest + 2 transversaux', () => {
    const { container } = monter('gest');
    const entries = container.querySelectorAll('[data-testid^="sidebar-entry-"]');
    expect(entries).toHaveLength(14);
    expect(screen.getByTestId('sidebar-entry-EC-GES-01')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-entry-EC-COM-03')).toBeInTheDocument();
  });

  it('rdep voit 7 entrées : 5 dédiés rdep + 2 transversaux', () => {
    const { container } = monter('rdep');
    const entries = container.querySelectorAll('[data-testid^="sidebar-entry-"]');
    expect(entries).toHaveLength(7);
    expect(screen.getByTestId('sidebar-entry-EC-RDEP-01')).toBeInTheDocument();
  });

  it('dir voit 7 entrées : 5 dédiés dir + 2 transversaux', () => {
    const { container } = monter('dir');
    const entries = container.querySelectorAll('[data-testid^="sidebar-entry-"]');
    expect(entries).toHaveLength(7);
    expect(screen.getByTestId('sidebar-entry-EC-DIR-01')).toBeInTheDocument();
  });

  it('n affiche pas l écran de connexion EC-COM-01 dans la sidebar', () => {
    const { container } = monter('admin');
    expect(container.querySelector('[data-testid="sidebar-entry-EC-COM-01"]')).toBeNull();
  });

  it('sans session, aucune entrée dédiée n est affichée', () => {
    const { container } = monter(null);
    const entries = container.querySelectorAll('[data-testid^="sidebar-entry-"]');
    expect(entries).toHaveLength(0);
  });
});
