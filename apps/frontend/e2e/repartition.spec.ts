// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

const PAS_DEMO = !process.env.BASE_URL || process.env.BASE_URL === 'http://localhost:5173';

test.describe('UF-RDEP-01 — Saisie et validation de la répartition pédagogique', () => {
  test('écran de saisie protégé sans session redirige vers /login', async ({ page }) => {
    test.skip(PAS_DEMO, 'Tests E2E ignorés : aucun environnement de démo disponible (BASE_URL non défini)');
    const reponse = await page.goto('/rdep/allocation', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\\/login/);
    expect(reponse?.status()).toBe(200);
  });

  test('écran de suivi protégé sans session redirige vers /login', async ({ page }) => {
    test.skip(PAS_DEMO, 'Tests E2E ignorés : aucun environnement de démo disponible (BASE_URL non défini)');
    const reponse = await page.goto('/rdep/charges', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\\/login/);
    expect(reponse?.status()).toBe(200);
  });

  test('endpoints de répartition sont protégés (401 sans session)', async ({ request }) => {
    test.skip(PAS_DEMO, 'Tests E2E ignorés : aucun environnement de démo disponible (BASE_URL non défini)');
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
});
