// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  type GenerationItem,
  type ScenarioSelectReponse,
} from '@takt/contracts';
import { generationApi } from './generation.api';
import { configurerApi } from './api';

const URL_BASE = 'http://test.api';
const UUID_VERSION = '11111111-1111-4111-8111-111111111111';
const UUID_GEN = '22222222-2222-4222-8222-222222222222';
const UUID_SCENARIO = '33333333-3333-4333-8333-333333333333';
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

function generationValide(overrides: Partial<GenerationItem> = {}): GenerationItem {
  return {
    id: UUID_GEN,
    versionId: UUID_VERSION,
    statut: 'TERMINEE',
    snapshotId: null,
    fichierDerivesId: null,
    scores: null,
    dureeMs: null,
    nombreScenarios: 3,
    createdAt: ISO,
    ...overrides,
  };
}

const scenarioValide = {
  id: UUID_SCENARIO,
  generationId: UUID_GEN,
  scoreGlobal: 85,
  sousScores: {},
  selectionne: false,
  placements: [],
  createdAt: ISO,
};

const reponseAdoption: ScenarioSelectReponse = {
  versionId: UUID_GEN,
  scenarioId: UUID_SCENARIO,
  nbSeances: 12,
  nbActivitesNonPlacees: 2,
  couverture: 85,
  conflitsResiduels: [],
  avertissements: [],
};
describe('generationApi — schémas d’enveloppe (GG-05)', () => {
  describe('lancer (POST /generations)', () => {
    it('envoie POST /generations avec { versionId } et retourne la génération depuis data de l’enveloppe', async () => {
      const gen = generationValide();
      fabriqueReponse = () => reponseJson(202, enveloppe(gen, null));

      const resultat = await generationApi.lancer(UUID_VERSION);

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/generations`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ versionId: UUID_VERSION }));
      expect(resultat).toEqual(gen);
    });

    it('lance une erreur si data est null', async () => {
      fabriqueReponse = () => reponseJson(202, enveloppe(null, null));

      await expect(generationApi.lancer(UUID_VERSION)).rejects.toThrow(
        'Aucune génération retournée au lancement.',
      );
    });
  });

  describe('lister (GET /generations)', () => {
    it('retourne { items, meta } depuis data de l’enveloppe', async () => {
      const gen = generationValide();
      fabriqueReponse = () =>
        reponseJson(
          200,
          enveloppe({ items: [gen], meta: { page: 1, pageSize: 10, total: 1 } }, null),
        );

      const resultat = await generationApi.lister(UUID_VERSION);

      const { url } = appelFetch();
      expect(url).toContain(`${URL_BASE}/generations`);
      expect(url).toContain('versionId=' + encodeURIComponent(UUID_VERSION));
      expect(resultat.items).toHaveLength(1);
      expect(resultat.items[0]!.id).toBe(UUID_GEN);
      expect(resultat.meta.total).toBe(1);
    });
  });
  describe('listerScenarios (GET /generations/:id/scenarios)', () => {
    it('retourne { items, statut } depuis data de l’enveloppe', async () => {
      fabriqueReponse = () =>
        reponseJson(200, enveloppe({ items: [scenarioValide], statut: 'TERMINEE' }, null));

      const resultat = await generationApi.listerScenarios(UUID_GEN);

      const { url } = appelFetch();
      expect(url).toContain(`${URL_BASE}/generations/${UUID_GEN}/scenarios`);
      expect(resultat.items[0]!.id).toBe(UUID_SCENARIO);
      expect(resultat.statut).toBe('TERMINEE');
    });
  });

  describe('annuler (POST /generations/:id/annuler)', () => {
    it('envoie POST /generations/:id/annuler avec le schéma d’enveloppe et ne lance pas d’erreur', async () => {
      fabriqueReponse = () =>
        reponseJson(200, enveloppe({ id: UUID_GEN, statut: 'ANNULEE' }, null));

      await expect(generationApi.annuler(UUID_GEN)).resolves.toBeUndefined();

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/generations/${UUID_GEN}/annuler`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{}');
    });
  });

  describe('adopterScenario (POST /generations/:id/select)', () => {
    it('envoie POST avec { scenarioId } et retourne la réponse depuis data de l’enveloppe', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(reponseAdoption, null));

      const resultat = await generationApi.adopterScenario(UUID_GEN, UUID_SCENARIO);

      const { url, init } = appelFetch();
      expect(url).toBe(`${URL_BASE}/generations/${UUID_GEN}/select`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ scenarioId: UUID_SCENARIO }));
      expect(resultat).toEqual(reponseAdoption);
      expect(resultat.couverture).toBe(85);
    });

    it('lance une erreur si aucune donnée retournée', async () => {
      fabriqueReponse = () => reponseJson(200, enveloppe(null, null));

      await expect(
        generationApi.adopterScenario(UUID_GEN, UUID_SCENARIO),
      ).rejects.toThrow('Aucune donnée retournée à l’adoption du scénario.');
    });
  });
});
