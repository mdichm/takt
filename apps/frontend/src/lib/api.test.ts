// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { zEnvelope } from '@takt/contracts';
import {
  api,
  configurerApi,
  type EvenementJournal,
  type ReponseApi,
  versPagination,
} from './api';
import { ErreurHttp } from './errors';

const URL_BASE = 'http://test.api';

const jetons: { valeur: string | null } = { valeur: 'jeton-access-1' };
let sessionsExpirées = 0;
const journaux: EvenementJournal[] = [];
const appelsFetch: Array<{ url: string; init: RequestInit }> = [];
let compteurRefresh = 0;
let rafraichirReussit = true;
let nouvelAccessToken = 'jeton-access-2';

const appelsParUrl = new Map<string, number>();

let fabriqueReponse: ((url: string) => Response) | null = null;

function reponseJson(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json' },
  });
}

function enveloppe(
  data: unknown,
  erreur: { code: string; message?: string } | null,
): unknown {
  return {
    data,
    error: erreur,
    meta: { requestId: 'req-test', timestamp: '2026-11-06T00:00:00Z' },
  };
}

const fetchMocke = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  appelsFetch.push({ url, init: init ?? {} });
  if (fabriqueReponse) {
    return fabriqueReponse(url);
  }
  return reponseJson(500, enveloppe(null, { code: 'INTERNAL_ERROR' }));
});

function configurerClient() {
  configurerApi({
    baseUrl: URL_BASE,
    obtenirJeton: () => jetons.valeur,
    surSessionExpirée: () => {
      sessionsExpirées += 1;
      jetons.valeur = null;
    },
    journaliser: (e) => journaux.push(e),
  });
}

beforeEach(() => {
  appelsFetch.length = 0;
  appelsParUrl.clear();
  compteurRefresh = 0;
  rafraichirReussit = true;
  nouvelAccessToken = 'jeton-access-2';
  jetons.valeur = 'jeton-access-1';
  sessionsExpirées = 0;
  journaux.length = 0;
  fabriqueReponse = null;
  vi.mocked(fetchMocke).mockClear();
  globalThis.fetch = fetchMocke;
  configurerClient();
});

afterEach(() => {});

describe('client HTTP (fetch natif)', () => {
  it('injecte le Bearer et envoie les cookies sur une requête GET', async () => {
    fabriqueReponse = () => reponseJson(200, enveloppe({ id: 1 }, null));

    const resultat = await api.get<{ id: number }>('/seances');

    expect(resultat.data).toEqual({ id: 1 });
    const appel = appelsFetch.find((a) => a.url === `${URL_BASE}/seances`);
    expect(appel).toBeDefined();
    const headersGet = appel!.init.headers as Record<string, string>;
    expect(headersGet.Authorization).toBe('Bearer jeton-access-1');
    expect(appel!.init.credentials).toBe('include');
  });

  it('POST envoie le corps en JSON et injecte le Bearer', async () => {
    fabriqueReponse = () => reponseJson(201, enveloppe({ id: 2 }, null));

    await api.post<{ id: number }>('/seances', { titre: 'Maths' });

    const appel = appelsFetch.find((a) => a.url === `${URL_BASE}/seances`);
    expect(appel).toBeDefined();
    expect(appel!.init.method).toBe('POST');
    const headersPost = appel!.init.headers as Record<string, string>;
    expect(headersPost['Content-Type']).toBe('application/json');
    expect(appel!.init.body).toBe(JSON.stringify({ titre: 'Maths' }));
    expect(headersPost.Authorization).toBe('Bearer jeton-access-1');
  });

  it('déstructure l’enveloppe et retourne data + meta', async () => {
    fabriqueReponse = () =>
      reponseJson(
        200,
        enveloppe(
          { items: ['a'] },
          null,
        ),
      );

    const schema = zEnvelope(
      z.object({ items: z.array(z.string()) }),
    );
    const resultat: ReponseApi<{ items: string[] }> = await api.get(
      '/seances',
      { schema },
    );

    expect(resultat.data).toEqual({ items: ['a'] });
    expect(resultat.meta.requestId).toBe('req-test');
  });
});

describe('versPagination', () => {
  it('mappe les méta vers les paramètres TanStack Query', () => {
    expect(
      versPagination({
        requestId: 'r',
        timestamp: 't',
        page: 3,
        pageSize: 50,
        total: 120,
      }),
    ).toEqual({ page: 3, pageSize: 50, total: 120 });
    expect(versPagination({ requestId: 'r', timestamp: 't' })).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });
});

describe('intercepteur 401 → refresh', () => {
  beforeEach(() => {
    fabriqueReponse = (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        compteurRefresh += 1;
        if (!rafraichirReussit) {
          return reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }));
        }
        return reponseJson(
          200,
          enveloppe({ accessToken: nouvelAccessToken }, null),
        );
      }
      const n = (appelsParUrl.get(url) ?? 0) + 1;
      appelsParUrl.set(url, n);
      if (n === 1) {
        return reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }));
      }
      return reponseJson(200, enveloppe({ ok: true }, null));
    };
  });

  it('rafraîchit une seule fois même sous plusieurs 401 concurrentes (single-flight)', async () => {
    const promises = [
      api.get<{ ok: boolean }>('/seances'),
      api.get<{ ok: boolean }>('/seances'),
      api.get<{ ok: boolean }>('/seances'),
    ];
    const resultats = await Promise.all(promises);

    expect(compteurRefresh).toBe(1);
    for (const resultat of resultats) {
      expect(resultat.data).toEqual({ ok: true });
    }
    const appelsSeances = appelsFetch.filter(
      (a) => a.url === `${URL_BASE}/seances`,
    );
    expect(appelsSeances.length).toBeGreaterThanOrEqual(3);
    // Chaque requête rejetée a été rejouée avec le nouveau Bearer.
    for (const appel of appelsSeances.slice(3)) {
      const headers = appel.init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer jeton-access-2');
    }
  });

  it('rejoue la requête originale avec le nouveau jeton', async () => {
    fabriqueReponse = (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        compteurRefresh += 1;
        return reponseJson(
          200,
          enveloppe({ accessToken: nouvelAccessToken }, null),
        );
      }
      const n = (appelsParUrl.get(url) ?? 0) + 1;
      appelsParUrl.set(url, n);
      return n === 1
        ? reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }))
        : reponseJson(200, enveloppe({ rejoue: true }, null));
    };

    const resultat = await api.get<{ rejoue: boolean }>('/seances');

    expect(resultat.data).toEqual({ rejoue: true });
    expect(compteurRefresh).toBe(1);
    const appelsSeances = appelsFetch.filter(
      (a) => a.url === `${URL_BASE}/seances`,
    );
    const headersRejoue2 = appelsSeances[1]!.init.headers as Record<string, string>;
    expect(headersRejoue2.Authorization).toBe('Bearer jeton-access-2');
  });

  it('401 persistant : purge de session + surSessionExpirée, un seul refresh', async () => {
    rafraichirReussit = false;
    fabriqueReponse = (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        compteurRefresh += 1;
        return reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }));
      }
      return reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }));
    };

    await expect(api.get<never>('/seances')).rejects.toThrow(ErreurHttp);
    expect(compteurRefresh).toBe(1);
    expect(sessionsExpirées).toBe(1);
    expect(jetons.valeur).toBeNull();
  });

  it('401 après rejet réussi (jeton invalide) : anti-boucle, pas de second refresh', async () => {
    let refreshAppeles = 0;
    fabriqueReponse = (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshAppeles += 1;
        return reponseJson(
          200,
          enveloppe({ accessToken: 'jeton-invalide-apres-refresh' }, null),
        );
      }
      return reponseJson(401, enveloppe(null, { code: 'UNAUTHORIZED' }));
    };

    await expect(api.get<never>('/seances')).rejects.toThrow(ErreurHttp);
    expect(refreshAppeles).toBe(1);
    expect(sessionsExpirées).toBe(1);
  });
});

describe('catalogue des 8 codes d’erreur', () => {
  const cas: Array<{
    statut: number;
    code: string;
    attendu: string;
  }> = [
    { statut: 400, code: 'VALIDATION_ERROR', attendu: 'Les informations saisies sont invalides. Vérifiez les champs indiqués.' },
    { statut: 401, code: 'UNAUTHORIZED', attendu: 'Votre session a expiré. Reconnectez-vous pour continuer.' },
    { statut: 403, code: 'FORBIDDEN', attendu: "Vous n'avez pas les droits nécessaires pour cette action. Contactez un administrateur." },
    { statut: 404, code: 'NOT_FOUND', attendu: 'La ressource demandée est introuvable ou a été supprimée.' },
    { statut: 409, code: 'WORKFLOW_INVALID_TRANSITION', attendu: 'Cette action n’est pas autorisée dans l’état actuel de la ressource.' },
    { statut: 423, code: 'SEANCE_LOCKED', attendu: 'Cette séance est verrouillée par un autre utilisateur. Déverrouillez-la ou contactez-la.' },
    { statut: 429, code: 'RATE_LIMITED', attendu: 'Trop de tentatives. Patientez quelques instants avant de réessayer.' },
    { statut: 500, code: 'INTERNAL_ERROR', attendu: 'Une erreur interne est survenue. Réessayez plus tard ou contactez le support.' },
  ];

  it.each(cas)('mappe le $statut ($code) vers une ErreurApi', async ({ statut, code, attendu }) => {
    fabriqueReponse = () => reponseJson(statut, enveloppe(null, { code }));

    let erreurCapturée: ErreurHttp | null = null;
    try {
      await api.get<never>('/seances');
    } catch (erreur) {
      erreurCapturée = erreur as ErreurHttp;
    }
    expect(erreurCapturée).not.toBeNull();
    expect(erreurCapturée!.code).toBe(code);
    expect(erreurCapturée!.statut).toBe(statut);
    expect(erreurCapturée!.message).toBe(attendu);
  });

  it('409 conserve le message du serveur (jamais générique)', async () => {
    fabriqueReponse = () =>
      reponseJson(
        409,
        enveloppe(null, {
          code: 'WORKFLOW_INVALID_TRANSITION',
          message: 'Erreur métier précise',
        }),
      );

    let erreurCapturée: ErreurHttp | null = null;
    try {
      await api.get<never>('/seances');
    } catch (erreur) {
      erreurCapturée = erreur as ErreurHttp;
    }
    expect(erreurCapturée).not.toBeNull();
    expect(erreurCapturée!.message).toBe('Erreur métier précise');
  });
});

describe('journalisation (aucun secret)', () => {
  it('journalise la requête sans token ni body', async () => {
    fabriqueReponse = () => reponseJson(200, enveloppe({ id: 1 }, null));

    await api.post<{ id: number }>('/seances', { secret: 'ne-pas-journaliser' });

    expect(journaux.length).toBe(1);
    const journal = journaux[0]!;
    expect(journal.statut).toBe(200);
    expect(journal.dureeMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(journal)).not.toContain('jeton-access-1');
    expect(JSON.stringify(journal)).not.toContain('ne-pas-journaliser');
  });
});
