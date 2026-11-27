// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  type Creneau,
  type Seance,
  type Lock,
} from '@takt/contracts';
import { planningApi } from './planning.api';
import { configurerApi } from './api';

const URL_BASE = 'http://test.api';
const UUID_VERSION = '11111111-1111-4111-8111-111111111111';
const UUID_SEANCE = '22222222-2222-4222-8222-222222222222';
const UUID_CRENEAU = '33333333-3333-4333-8333-333333333333';
const UUID_LOCK = '44444444-4444-4444-8444-444444444444';
const ISO = '2026-01-01T00:00:00Z';

function reponseJson(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json' },
  });
}

/** Construit une enveloppe API { data, error, meta }. */
function enveloppe(
  data: unknown,
  erreur: { code: string; message?: string } | null = null,
  meta: { page?: number; pageSize?: number; total?: number } = {},
): unknown {
  return {
    data,
    error: erreur,
    meta: { requestId: 'req-test', timestamp: ISO, ...meta },
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

/** Extrait le premier appel fetch (typé, sans assertion non-null superflue). */
function appelFetch(): { url: string; init: RequestInit } {
  const [url, init] =
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
  return { url, init };
}

function seanceValide(overrides: Partial<Seance> = {}): Seance {
  const base: Seance = {
    id: UUID_SEANCE,
    versionId: UUID_VERSION,
    jour: 2,
    creneauDebutId: UUID_CRENEAU,
    nbCreneaux: 1,
    salleId: null,
    enseignantId: null,
    groupeId: null,
    matiereId: null,
    typeEnseignementId: null,
    affectationId: UUID_VERSION,
    estVerrouillee: false,
    createdAt: ISO,
    updatedAt: ISO,
    creneauDebut: {
      id: UUID_CRENEAU,
      jour: 2,
      ordre: 1,
      heureDebut: '2026-01-01T08:00:00Z',
      heureFin: '2026-01-01T09:00:00Z',
      dureeMinutes: 60,
      createdAt: ISO,
      updatedAt: ISO,
    },
    salle: null,
    enseignant: null,
    groupe: null,
    matiere: null,
    typeEnseignement: null,
    affectation: {
      id: UUID_VERSION,
      versionId: UUID_VERSION,
      semestreId: UUID_VERSION,
      departementId: UUID_VERSION,
      enseignantId: UUID_VERSION,
      matiereId: UUID_VERSION,
      groupeId: UUID_VERSION,
      typeEnseignementId: null,
      volumeHebdo: 2,
      dureeCreneaux: null,
      createdAt: ISO,
      updatedAt: ISO,
    },
    verrous: [],
    ...overrides,
  };
  return base;
}
describe('planningApi — schémas d’enveloppe (GG-05)', () => {
  describe('listerSeances (GET /seances)', () => {
    it('appelle GET avec les filtres et retourne { items, meta } depuis data de l’enveloppe', async () => {
      const seance = seanceValide();
      fabriqueReponse = () => reponseJson(200, enveloppe([seance], null, { page: 1, pageSize: 10, total: 1 }));

      const resultat = await planningApi.listerSeances({
        versionId: UUID_VERSION,
        page: 1,
        pageSize: 10,
      });

      const { url } = appelFetch();
      expect(url).toContain(`${URL_BASE}/seances`);
      expect(url).toContain('versionId=' + encodeURIComponent(UUID_VERSION));
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=10');
      expect(resultat.items).toHaveLength(1);
      expect(resultat.items[0]!.id).toBe(UUID_SEANCE);
      expect(resultat.meta.page).toBe(1);
      expect(resultat.meta.pageSize).toBe(10);
      expect(resultat.meta.total).toBe(1);
    });

    it('rejette une réponse qui n’est pas une enveloppe valide (VALIDATION_ERROR)', async () => {
      fabriqueReponse = () =>
        reponseJson(200, {
          data: 'pas_un_tableau',
          error: null,
          meta: { requestId: 'req-test', timestamp: ISO },
        });

      await expect(
        planningApi.listerSeances({ versionId: UUID_VERSION, page: 1, pageSize: 10 }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statut: 400,
      });
    });
  });

  describe('obtenirSeance (GET /seances/:id)', () => {
    it('appelle GET /seances/:id avec le schéma zEnvelope(zSeance) et retourne data', async () => {
      const seance = seanceValide();
      fabriqueReponse = () => reponseJson(200, enveloppe(seance, null));

      const resultat = await planningApi.obtenirSeance(UUID_SEANCE);

      const { url } = appelFetch();
      expect(url).toBe(`${URL_BASE}/seances/${UUID_SEANCE}`);
      expect(resultat).toEqual(seance);
    });

    it('lance une erreur si data est null', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(null, null));

      await expect(planningApi.obtenirSeance(UUID_SEANCE)).rejects.toThrow(
        'Aucune seance retournee.',
      );
    });
  });
  describe('deplacerSeance (PATCH /seances/:id)', () => {
    it("envoie le corps en PATCH et retourne data de l'enveloppe", async () => {
      const seance = seanceValide({ jour: 3 });
      fabriqueReponse = () => reponseJson(200, enveloppe(seance, null));

      const resultat = await planningApi.deplacerSeance(UUID_SEANCE, { jour: 3 });

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/seances/${UUID_SEANCE}`);
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ jour: 3 }));
      expect(resultat.jour).toBe(3);
    });
  });

  describe('listerVerrous (GET /locks)', () => {
    it('retourne { items, meta } depuis data de l’enveloppe', async () => {
      const verrou: Lock = {
        id: UUID_LOCK,
        versionId: UUID_VERSION,
        seanceId: UUID_SEANCE,
        utilisateurId: UUID_VERSION,
        type: 'SALLE',
        valeur: UUID_CRENEAU,
        poids: 100,
        datePose: ISO,
      };
      fabriqueReponse = () => reponseJson(200, enveloppe([verrou], null, { page: 1, pageSize: 10, total: 1 }));

      const resultat = await planningApi.listerVerrous({ versionId: UUID_VERSION, page: 1, pageSize: 10 });

      expect(resultat.items).toHaveLength(1);
      expect(resultat.items[0]!.id).toBe(UUID_LOCK);
      expect(resultat.meta.total).toBe(1);
    });
  });

  describe('listerCreneaux (GET /referentiels/creneaux)', () => {
    it('retourne { items, meta } depuis data de l’enveloppe', async () => {
      const creneau: Creneau = {
        id: UUID_CRENEAU,
        jour: 1,
        ordre: 1,
        heureDebut: '2026-01-01T08:00:00Z',
        heureFin: '2026-01-01T09:00:00Z',
        dureeMinutes: 60,
        createdAt: ISO,
        updatedAt: ISO,
      };
      fabriqueReponse = () =>
        reponseJson(200, enveloppe([creneau], null, { page: 1, pageSize: 10, total: 1 }));

      const resultat = await planningApi.listerCreneaux();

      expect(resultat.items).toHaveLength(1);
      expect(resultat.items[0]!.id).toBe(UUID_CRENEAU);
    });
  });

  describe('detecterConflits (GET /versions/:id/conflits)', () => {
    it("retourne l'objet { conflits, bloquant } depuis data de l'enveloppe", async () => {
      fabriqueReponse = () =>
        reponseJson(200, enveloppe({ conflits: [], bloquant: false }, null));

      const resultat = await planningApi.detecterConflits(UUID_VERSION, {
        jour: 2,
        creneauDebutId: UUID_CRENEAU,
        nbCreneaux: 1,
      });

      expect(resultat).toEqual({ conflits: [], bloquant: false });
      const { url } = appelFetch();
      expect(url).toContain(`${URL_BASE}/versions/${UUID_VERSION}/conflits`);
      expect(url).toContain('jour=2');
      expect(url).toContain('nbCreneaux=1');
    });
  });
  describe('acquerirBail / renouvelerBail (POST /versions/:id/bail)', () => {
    it('retourne le bail depuis data de l’enveloppe', async () => {
      const bail = {
        id: UUID_LOCK,
        versionId: UUID_VERSION,
        utilisateurId: UUID_VERSION,
        dateDebut: ISO,
        dateFin: ISO,
        derniereActivite: ISO,
        detenteur: 'Marie Dupont',
      };
      fabriqueReponse = () => reponseJson(200, enveloppe(bail, null));

      const resultat = await planningApi.acquerirBail(UUID_VERSION);

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/versions/${UUID_VERSION}/bail`);
      expect(init.method).toBe('POST');
      expect(resultat).toEqual(bail);
    });
  });

  describe('poserVerrou (POST /locks)', () => {
    it("envoie le corps en POST et retourne le verrou depuis data de l'enveloppe", async () => {
      const verrou: Lock = {
        id: UUID_LOCK,
        versionId: UUID_VERSION,
        seanceId: UUID_SEANCE,
        utilisateurId: UUID_VERSION,
        type: 'SALLE',
        valeur: UUID_CRENEAU,
        poids: 100,
        datePose: ISO,
      };
      fabriqueReponse = () => reponseJson(201, enveloppe(verrou, null));

      const resultat = await planningApi.poserVerrou({
        versionId: UUID_VERSION,
        type: 'SALLE',
        valeur: UUID_CRENEAU,
        poids: 100,
        seanceId: UUID_SEANCE,
      });

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/locks`);
      expect(init.method).toBe('POST');
      expect(init.body).toContain('"type":"SALLE"');
      expect(resultat.id).toBe(UUID_LOCK);
    });
  });

  describe('suppressions (DELETE sans schéma de données)', () => {
    it('leverVerrou appelle DELETE /locks/:id', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(null, null));
      await planningApi.leverVerrou(UUID_LOCK);
      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/locks/${UUID_LOCK}`);
      expect(init.method).toBe('DELETE');
    });

    it('libererBail appelle DELETE /versions/:id/bail', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(null, null));
      await planningApi.libererBail(UUID_VERSION);
      const { url } = appelFetch();
      expect(url).toBe(`${URL_BASE}/versions/${UUID_VERSION}/bail`);
    });

    it('forcerBail appelle DELETE /bails/:id', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(null, null));
      await planningApi.forcerBail(UUID_LOCK);
      const { url } = appelFetch();
      expect(url).toBe(`${URL_BASE}/bails/${UUID_LOCK}`);
    });
  });
});
