// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { creerMockFetch, type ReponseMocke } from './reseau';

describe('mock fetch (reseau)', () => {
  it('retourne une réponse JSON avec le bon statut', async () => {
    const reponse: ReponseMocke = {
      status: 200,
      ok: true,
      json: { message: 'ok' },
    };
    const fetchMock = creerMockFetch(reponse);

    const res = await fetch('https://api.takt.test/data');
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
    expect(body).toEqual({ message: 'ok' });
  });

  it('retourne une réponse d’erreur avec statut 401', async () => {
    const reponse: ReponseMocke = {
      status: 401,
      ok: false,
      json: { code: 'UNAUTHORIZED', message: 'session expirée' },
    };
    creerMockFetch(reponse);

    const res = await fetch('https://api.takt.test/refresh');
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.ok).toBe(false);
    expect(body).toEqual({ code: 'UNAUTHORIZED', message: 'session expirée' });
  });

  it('est réutilisable : plusieurs appels utilisent le même mock', async () => {
    const reponse: ReponseMocke = { status: 201, ok: true, json: { id: 'abc' } };
    const fetchMock = creerMockFetch(reponse);

    await fetch('https://api.takt.test/a');
    await fetch('https://api.takt.test/b');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
