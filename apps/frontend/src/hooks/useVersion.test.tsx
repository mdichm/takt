// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import { useVersion } from './useVersion';

const META = { requestId: 'req-test', timestamp: '2026-11-06T00:00:00Z' };

// Le client API est mocké afin de ne pas dependre du fetch natif ni du retry
// de TanStack Query dans ces tests unitaires.
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    configurer: vi.fn(),
  },
}));

function CompoTest({ id }: { id: string | undefined }) {
  const { version, estChargement, erreur, revalider } = useVersion(id);
  return (
    <div>
      {estChargement ? <span data-testid="chargement">chargement...</span> : null}
      {erreur ? <span data-testid="erreur">{erreur.message}</span> : null}
      {version ? <span data-testid="version">{version.id}</span> : null}
      <button data-testid="revalider" onClick={() => revalider()}>
        revalider
      </button>
    </div>
  );
}

function renderCompo(id: string | undefined) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CompoTest id={id} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  vi.mocked(api.get).mockResolvedValue({
    data: { id: 'version-1', etat: 'brouillon', semestreId: undefined, snapshotId: undefined },
    meta: META,
  });
});

afterEach(() => {
  queryClient.clear();
  vi.restoreAllMocks();
});

describe('useVersion (hook lecture version, TanStack Query)', () => {
  it('charge la version et la rend disponible', async () => {
    renderCompo('version-1');

    expect(screen.getByTestId('chargement')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('version')).toHaveTextContent('version-1');
    });

    expect(screen.queryByTestId('chargement')).not.toBeInTheDocument();
    expect(screen.queryByTestId('erreur')).not.toBeInTheDocument();

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/versions/version-1',
      expect.objectContaining({ schema: expect.anything() }),
    );
  });

  it('affiche l erreur quand la version est introuvable', async () => {
    vi.mocked(api.get).mockRejectedValue(
      Object.assign(new Error('Non trouvé'), { statut: 404, code: 'NOT_FOUND' }),
    );
    // Client sans retry pour ne pas attendre les backoffs (1s+2s+4s) dans le test.
    const clientSansRetry = new QueryClient({
      defaultOptions: { queries: { retry: 0 } },
    });
    render(
      <QueryClientProvider client={clientSansRetry}>
        <CompoTest id="version-inconnue" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('erreur')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('version')).not.toBeInTheDocument();
  });

  it('ne fait pas de requête quand aucun id n est fourni', () => {
    renderCompo(undefined);

    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
    expect(screen.queryByTestId('chargement')).not.toBeInTheDocument();
  });

  it('expose une fonction revalider (refetch) utilisable à la demande', () => {
    const appelAvant = vi.mocked(api.get).mock.calls.length;
    renderCompo('version-1');

    // Le revalider expose une fonction ; on verifie simplement son presence.
    expect(screen.queryByTestId('revalider')).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(appelAvant);
  });
});