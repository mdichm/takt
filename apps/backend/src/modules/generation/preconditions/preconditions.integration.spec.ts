// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { PreconditionsController } from './preconditions.controller';
import { PreconditionsService } from './preconditions.service';
import type { ResultatPreconditions } from '@takt/contracts';

const RESULTAT_FAUX: ResultatPreconditions = {
  satisfaites: true,
  violations: [],
  avertissements: [],
};

describe('PreconditionsController (TAKT-L07-07) — wiring controleur', () => {
  it('appelle le service et retourne lenveloppe { data, error, meta }', async () => {
    const service = {
      checkGenerationPreconditions: async (): Promise<ResultatPreconditions> =>
        RESULTAT_FAUX,
    } as unknown as PreconditionsService;
    const controller = new PreconditionsController(service);

    const reponse = await controller.preconditions({ versionId: '11111111-1111-1111-1111-111111111111' });

    expect(reponse).toMatchObject({
      data: RESULTAT_FAUX,
      error: null,
    });
    expect(reponse.meta).toHaveProperty('timestamp');
  });

  it('propage le resultat du service (cas avec violations)', async () => {
    const resultatAvecViolations: ResultatPreconditions = {
      satisfaites: false,
      violations: [
        { code: 'ETAT_VERSION_INVALIDE', message: 'etat invalide' },
      ],
      avertissements: [],
    };
    const service = {
      checkGenerationPreconditions: async (): Promise<ResultatPreconditions> =>
        resultatAvecViolations,
    } as unknown as PreconditionsService;
    const controller = new PreconditionsController(service);

    const reponse = await controller.preconditions({ versionId: '11111111-1111-1111-1111-111111111111' });

    expect(reponse.data).toEqual(resultatAvecViolations);
    expect(reponse.error).toBeNull();
  });
});
