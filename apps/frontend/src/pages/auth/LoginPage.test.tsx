// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}));
vi.mock('@/stores/userStore', () => {
  const definirSession = vi.fn();
  return {
    userStore: {
      getState: vi.fn(() => ({ definirSession })),
    },
  };
});

import { api } from '@/lib/api';
import { ReponseApi } from '@/lib/api';
import { userStore } from '@/stores/userStore';
import { ReponseLogin } from '@/lib/validation';

const mockPost = vi.mocked(api.post);
const mockDefinirSession = vi.mocked(userStore.getState().definirSession);

function rendreLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockPost.mockClear();
  mockDefinirSession.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LoginPage (EC-COM-01, L09-01)', () => {
  it('rend le formulaire de connexion avec le titre', () => {
    rendreLoginPage();
    expect(screen.getByRole('heading', { name: /TAKT/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i, { selector: 'input' })).toBeInTheDocument();
  });

  it('définit la session et redirige vers l’écran par défaut du rôle après un login réussi', async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: 'jeton-access-test',
          utilisateur: {
            id: 'u-1',
            email: 'alice@takt.fr',
            nom: 'Dupont',
            prenom: 'Alice',
            role: 'gest',
          },
        },
        error: null,
        meta: { requestId: 'req-1', timestamp: '2026-01-01T00:00:00Z' },
      },
      meta: { requestId: 'req-1', timestamp: '2026-01-01T00:00:00Z' },
    } as ReponseApi<ReponseLogin>);

    rendreLoginPage();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'alice@takt.fr' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'motdepasse123' },
    });
    const form = document.getElementById('formulaire-connexion')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() => expect(mockDefinirSession).toHaveBeenCalled());
    const sessionPasse = mockDefinirSession.mock.calls[0]![0];
    expect(sessionPasse.role).toBe('gest');
    expect(sessionPasse.departementIds).toEqual([]);
    expect(mockDefinirSession.mock.calls[0]![1]).toBe('jeton-access-test');
  });

  it('affiche « Identifiants incorrects. » en cas de 401 (sans énumération)', async () => {
    const erreur = new Error('Identifiants invalides') as Error & { statut: number };
    erreur.statut = 401;
    mockPost.mockRejectedValue(erreur);

    rendreLoginPage();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'alice@takt.fr' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'mauvais' },
    });
    const form = document.getElementById('formulaire-connexion')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Identifiants incorrects.'),
    );
    expect(mockDefinirSession).not.toHaveBeenCalled();
  });

  it('affiche « Trop de tentatives, réessayez plus tard. » en cas de 429', async () => {
    const erreur = new Error('Trop de tentatives') as Error & { statut: number };
    erreur.statut = 429;
    mockPost.mockRejectedValue(erreur);

    rendreLoginPage();
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i, { selector: 'input' }), {
      target: { value: 'alice@takt.fr' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), {
      target: { value: 'motdepasse123' },
    });
    const form = document.getElementById('formulaire-connexion')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Trop de tentatives, réessayez plus tard.',
      ),
    );
    expect(mockDefinirSession).not.toHaveBeenCalled();
  });
});
