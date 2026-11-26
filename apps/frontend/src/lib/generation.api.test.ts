// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generationApi } from './generation.api';
import { api } from './api';
import { type ScenarioSelectReponse } from '@takt/contracts';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

const UUID_GEN = '11111111-1111-4111-8111-111111111111';
const UUID_SCENARIO = '22222222-2222-4222-8222-222222222222';

describe('generationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adopterScenario', () => {
    it('appelle POST /generations/:id/select avec le scénario et retourne la réponse', async () => {
      const reponseAttendue: ScenarioSelectReponse = {
        versionId: UUID_GEN,
        scenarioId: UUID_SCENARIO,
        nbSeances: 12,
        nbActivitesNonPlacees: 2,
        couverture: 85,
        conflitsResiduels: [],
        avertissements: [],
      };
      vi.mocked(api.post).mockResolvedValue({
        data: reponseAttendue,
        meta: { requestId: 'req-1', timestamp: '2026-01-01T00:00:00.000Z' },
      } as unknown as { data: ScenarioSelectReponse; meta: { requestId: string; timestamp: string } });

      const resultat = await generationApi.adopterScenario(UUID_GEN, UUID_SCENARIO);

      expect(api.post).toHaveBeenCalledWith(
        `/generations/${encodeURIComponent(UUID_GEN)}/select`,
        { scenarioId: UUID_SCENARIO },
        { schema: expect.anything() },
      );
      expect(resultat).toEqual(reponseAttendue);
      expect(resultat.nbSeances).toBe(12);
      expect(resultat.couverture).toBe(85);
    });

    it('lance une erreur si aucune donnée retournée', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: null,
        meta: { requestId: 'req-1', timestamp: '2026-01-01T00:00:00.000Z' },
      } as unknown as { data: null; meta: { requestId: string; timestamp: string } });

      await expect(
        generationApi.adopterScenario(UUID_GEN, UUID_SCENARIO),
      ).rejects.toThrow('Aucune donnée retournée à l’adoption du scénario.');
    });
  });
});