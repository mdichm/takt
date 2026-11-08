// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

test.describe('Import CSV des referentiels (L04-07)', () => {
  test("ecran d'import protege : redirection vers /login sans session", async ({ page }) => {
    const reponse = await page.goto('/ges/init', { waitUntil: 'networkidle' });
    // L'ecran d'import (EC-GES-01) est protege : sans session on redirige vers le login.
    await expect(page).toHaveURL(/\/login/);
    expect(reponse?.status()).toBe(200);
  });
});

test.describe('Import depuis une annee cloturee (L04-08)', () => {
  test('les endpoints archive existent et sont proteges (401 sans session)', async ({
    request,
  }) => {
    const anneesSource = await request.get(`${API}/referentiels/import/archive/annees-source`);
    expect(anneesSource.status()).toBe(401);

    const types = await request.get(`${API}/referentiels/import/archive/types`);
    expect(types.status()).toBe(401);

    const apercu = await request.post(`${API}/referentiels/import/archive/apercu`);
    expect(apercu.status()).toBe(401);

    const executer = await request.post(`${API}/referentiels/import/archive/executer`);
    expect(executer.status()).toBe(401);
  });
});
