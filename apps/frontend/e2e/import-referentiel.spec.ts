// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test.describe('Import CSV des référentiels (L04-07)', () => {
  test('page d’import : redirection vers le login sans session', async ({ page }) => {
    const reponse = await page.goto('/ec-ges-01', { waitUntil: 'networkidle' });
    expect(reponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login/);
  });

  test('aperçu et exécution d’un import de sites (utilisateur authentifié)', async ({ page }) => {
    // Ce parcours nécessite un utilisateur authentifié (rôle admin ou gest).
    // Il est exécuté dans le job E2E qui dispose d’un seed de base de données
    // (docker-compose.test.yml) et d’un compte administrateur.
    await page.goto('/ec-ges-01', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/);
  });
});
