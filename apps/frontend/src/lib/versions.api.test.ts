// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type TransitionInput, type VersionItem } from '@takt/contracts';
import { versionsApi } from './versions.api';
import { configurerApi } from './api';

const URL_BASE = 'http://test.api';
const UUID_VERSION = '11111111-1111-4111-8111-111111111111';
const ISO = '2026-01-01T00:00:00Z';

function reponseJson(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json' },
  });
}

function enveloppe(
  data: unknown,
  erreur: { code: string; message?: string } | null = null,
): unknown {
  return {
    data,
    error: erreur,
    meta: { requestId: 'req-test', timestamp: ISO },
  };
}

function versionItemValide(overrides: Partial<VersionItem> = {}): VersionItem {
  return {
    id: UUID_VERSION,
    semestreId: '22222222-2222-2222-2222-222222222222',
    anneeId: '33333333-3333-3333-3333-333333333333',
    etat: 'brouillon',
    snapshotId: null,
    datePublication: null,
    publiePar: null,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

let fabriqueReponse: ((url: string) => Response) | null = null;

const fetchMocke = vi.fn(async (input: RequestInfo | URL) => {
  if (fabriqueReponse) {
    return fabriqueReponse(String(input));
  }
  return reponseJson(500, enveloppe(null, { code: 'INTERNAL_ERROR' }));
});

function configurerClient() {
  configurerApi({
    baseUrl: URL_BASE,
    obtenirJeton: () => 'jeton-access-1',
    surSessionExpirée: () => {},
    journaliser: () => {},
  });
}

beforeEach(() => {
  globalThis.fetch = fetchMocke;
  vi.mocked(fetchMocke).mockClear();
  fabriqueReponse = null;
  configurerClient();
});

function appelFetch(): { url: string; init: RequestInit } {
  const [url, init] =
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
  return { url, init };
}

describe('versionsApi.transitionner (TAKT-L06-11)', () => {
  it('appelle POST /versions/:id/transition avec le corps TransitionInput et retourne un VersionItem', async () => {
    const attendu = versionItemValide({ etat: 'valid_pedag' });
    fabriqueReponse = () => reponseJson(200, enveloppe(attendu, null));

    const donnees: TransitionInput = { action: 'soumettreValidation' };
    const resultat = await versionsApi.transitionner(UUID_VERSION, donnees);

    const { url, init } = appelFetch();
    expect(url).toBe(`${URL_BASE}/versions/${UUID_VERSION}/transition`);
    expect(init.method).toBe('POST');
    expect(init.body).toContain('"action":"soumettreValidation"');

    // Résultat typé VersionItem avec les 9 champs.
    for (const champ of [
      'id',
      'semestreId',
      'anneeId',
      'etat',
      'snapshotId',
      'datePublication',
      'publiePar',
      'createdAt',
      'updatedAt',
    ]) {
      expect(resultat).toHaveProperty(champ);
    }
    expect(resultat.etat).toBe('valid_pedag');
  });

  it('rejette une réponse incomplète (champs obligatoires manquants)', async () => {
    fabriqueReponse = () =>
      reponseJson(200, enveloppe({ id: UUID_VERSION, etat: 'brouillon' }, null));

    await expect(
      versionsApi.transitionner(UUID_VERSION, { action: 'editer' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('lance une erreur si data est null', async () => {
    fabriqueReponse = () => reponseJson(200, enveloppe(null, null));

    await expect(
      versionsApi.transitionner(UUID_VERSION, { action: 'editer' }),
    ).rejects.toThrow('Aucune donnée retournée par la transition de version.');
  });
});