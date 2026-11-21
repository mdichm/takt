// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders, declencherPurgeSessionGlobale } from './providers';
import { userStore } from '@/stores/userStore';

const mocks = vi.hoisted(() => ({
  mockDeconnecter: vi.fn(),
  mockClear: vi.fn(),
}));

vi.mock('@/stores/userStore', () => ({
  userStore: {
    getState: vi.fn(() => ({
      estAuthentifie: true,
      jetonAcces: 'test-token',
      deconnecter: mocks.mockDeconnecter,
    })),
    setState: vi.fn(),
  },
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    clear: mocks.mockClear,
    mount: vi.fn(),
    unmount: vi.fn(),
  },
}));

describe('AppProviders (gestion globale 401)', () => {
  const Consommateur = (): JSX.Element => (
    <div data-testid="enfant">Contenu enfant</div>
  );

  beforeEach(() => {
    cleanup();
    vi.stubGlobal(
      'EventSource',
      vi.fn(() => ({ close: vi.fn() })) as unknown as typeof EventSource,
    );
    mocks.mockDeconnecter.mockClear();
    mocks.mockClear.mockClear();

    vi.mocked(userStore.getState).mockReturnValue({
      session: null,
      estAuthentifie: true,
      jetonAcces: 'test-token',
      deconnecter: mocks.mockDeconnecter,
      obtenirJeton: null,
      definirSession: vi.fn(),
      setJeton: vi.fn(),
      configurerQueryClient: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: mock du store Zustand, cast nécessaire pour le test
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('rend les enfants dans la structure complete', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <Consommateur />
        </AppProviders>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('enfant')).toHaveTextContent('Contenu enfant');
  });

  it('declenche deconnecter, vide le cache quand la purge 401 est declenchee', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppProviders>
          <Consommateur />
        </AppProviders>
      </MemoryRouter>,
    );

    declencherPurgeSessionGlobale();

    expect(mocks.mockDeconnecter).toHaveBeenCalledTimes(1);
    expect(mocks.mockClear).toHaveBeenCalledTimes(1);
  });
});
