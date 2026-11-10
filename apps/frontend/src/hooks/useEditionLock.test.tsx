// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { api } from '@/lib/api';
import { ErreurHttp } from '@/lib/errors';
import { useEditionLock } from './useEditionLock';

const META = { requestId: 'req-test', timestamp: '2026-11-06T00:00:00Z' };

function reponseBail() {
  return { data: { bail: 'ok' }, meta: META };
}

function CompoTest({ versionId }: { versionId?: string }) {
  const { acquis, erreur423, detenteur, estVerrouilleParAutre, acquerir, liberer } =
    useEditionLock(versionId);
  return (
    <div>
      {acquis ? <span data-testid="acquis">bail acquis</span> : null}
      {erreur423 ? <span data-testid="erreur423">verrouillé</span> : null}
      {detenteur ? <span data-testid="detenteur">{detenteur}</span> : null}
      {estVerrouilleParAutre ? <span data-testid="verrouilleParAutre">oui</span> : null}
      <button data-testid="acquerir" onClick={() => acquerir()}>
        acquerir
      </button>
      <button data-testid="liberer" onClick={() => liberer()}>
        libérer
      </button>
    </div>
  );
}

/** Vide les microtâches générées par les promesses mockées. */
async function viderMicrotaches() {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

// Le client API est mocké pour ces tests unitaires du bail d edition.
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

beforeEach(() => {
  vi.mocked(api.post).mockResolvedValue(reponseBail());
  vi.mocked(api.del).mockResolvedValue({ data: null, meta: META });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useEditionLock (bail d édition, contrat L06-07)', () => {
  it('acquiert le bail au montage', async () => {
    render(<CompoTest versionId="version-1" />);

    await viderMicrotaches();

    expect(await screen.findByTestId('acquis')).toHaveTextContent('bail acquis');
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/versions/version-1/bail', undefined);
  });

  it('expose le détenteur en cas de 423 (SEANCE_LOCKED)', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ErreurHttp('SEANCE_LOCKED', 423, 'Verrouillé', { detenteur: 'Jean Martin' }),
    );
    render(<CompoTest versionId="version-verrouillee" />);

    await viderMicrotaches();

    expect(await screen.findByTestId('erreur423')).toBeInTheDocument();
    expect(await screen.findByTestId('detenteur')).toHaveTextContent('Jean Martin');
    expect(await screen.findByTestId('verrouilleParAutre')).toHaveTextContent('oui');
    expect(screen.queryByTestId('acquis')).not.toBeInTheDocument();
  });

  it('libère le bail à la demande', async () => {
    render(<CompoTest versionId="version-1" />);
    await viderMicrotaches();
    expect(await screen.findByTestId('acquis')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('liberer').click();
    });
    await viderMicrotaches();

    expect(screen.queryByTestId('acquis')).not.toBeInTheDocument();
    expect(vi.mocked(api.del)).toHaveBeenCalledWith('/versions/version-1/bail');
  });

  it('renouvelle le bail périodiquement avec des faux timers', async () => {
    vi.useFakeTimers();
    render(<CompoTest versionId="version-1" />);
    await viderMicrotaches();
    vi.advanceTimersByTime(0);
    expect(screen.getByTestId('acquis')).toBeInTheDocument();

    const appelsAvant = vi.mocked(api.post).mock.calls.length;

    // Avance de 5 min → déclenche le renouvellement
    vi.advanceTimersByTime(5 * 60 * 1000);
    await viderMicrotaches();

    expect(vi.mocked(api.post).mock.calls.length).toBeGreaterThan(appelsAvant);

    const appelRenouvellement = vi
      .mocked(api.post)
      .mock.calls.find(([url]) => String(url).endsWith('/bail/renouveler'));
    expect(appelRenouvellement).toBeDefined();
    vi.useRealTimers();
  });

  it('relâche le bail si le renouvellement échoue', async () => {
    vi.useFakeTimers();
    render(<CompoTest versionId="version-1" />);
    await viderMicrotaches();
    vi.advanceTimersByTime(0);
    expect(screen.getByTestId('acquis')).toBeInTheDocument();

    // Le renouvellement suivant échoue → libération
    vi.mocked(api.post).mockRejectedValueOnce(new ErreurHttp('INTERNAL_ERROR', 500, 'Erreur'));
    vi.advanceTimersByTime(5 * 60 * 1000);
    await viderMicrotaches();

    expect(screen.queryByTestId('acquis')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
