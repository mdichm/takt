// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

test.describe.skip(
  !process.env.BASE_URL || process.env.BASE_URL === 'http://localhost:5173',
  'Tests E2E ignores : aucun environnement de demo disponible (BASE_URL non defini)',
  () => {
    test('ecran de saisie protege sans session redirige vers /login', async ({ page }) => {
      const reponse = await page.goto('/rdep/allocation', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('ecran de suivi protege sans session redirige vers /login', async ({ page }) => {
      const reponse = await page.goto('/rdep/charges', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('endpoints de repartition sont proteges (401 sans session)', async ({ request }) => {
      const lister = await request.get(`${API}/affectations?versionId=test&departementId=test`);
      expect(lister.status()).toBe(401);

      const valider = await request.post(`${API}/repartition/valider`, {
        data: { versionId: 'test', departementId: 'test' },
      });
      expect(valider.status()).toBe(401);

      const annuler = await request.post(`${API}/repartition/annuler`, {
        data: { versionId: 'test', departementId: 'test' },
      });
      expect(annuler.status()).toBe(401);
    });
  }
);
