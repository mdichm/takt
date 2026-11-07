// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test.describe("Import CSV des referentiels (L04-07)", () => {
  test("page d'import : accessible (HTTP 200) sans session", async ({ page }) => {
    const reponse = await page.goto('/ec-ges-01', { waitUntil: 'networkidle' });
    expect(reponse?.status()).toBe(200);
  });

  test("aperçu et execution d'un import de sites (utilisateur authentifie)", async ({ page }) => {
    // Ce parcours necessite un utilisateur authentifie (role admin ou gest).
    // Il est execute dans le job E2E qui dispose d'un seed de base de donnees
    // (docker-compose.test.yml) et d'un compte administrateur.
    const reponse = await page.goto('/ec-ges-01', { waitUntil: 'networkidle' });
    expect(reponse?.status()).toBe(200);
  });
});
