// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

test.describe('Direction — écrans EC-DIR-01 à EC-DIR-05 (TAKT-L09-13)', () => {

  test.describe('Protection des routes (rôle dir requis)', () => {
    test('EC-DIR-01 /dir/scenario redirige vers /login sans session', async ({ page }) => {
      const reponse = await page.goto('/dir/scenario', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('EC-DIR-02 /dir/decision redirige vers /login sans session', async ({ page }) => {
      const reponse = await page.goto('/dir/decision', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('EC-DIR-03 /dir/reject redirige vers /login sans session', async ({ page }) => {
      const reponse = await page.goto('/dir/reject', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('EC-DIR-04 /dir/archive redirige vers /login sans session', async ({ page }) => {
      const reponse = await page.goto('/dir/archive', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/login/);
      expect(reponse?.status()).toBe(200);
    });

    test('EC-DIR-05 /dir/exports redirige vers /login sans session', async ({ page }) => {
      const reponse = await page.goto('/dir/exports', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/login/);
      expect(reponse?.status()).toBe(200);
    });
  });

  test.describe('Endpoints API protégés (401 sans session)', () => {
    test('GET /versions retourne 401', async ({ request }) => {
      const versions = await request.get(`${API}/versions`);
      expect(versions.status()).toBe(401);
    });

    test('GET /repartition/revalidation/statuts retourne 401', async ({ request }) => {
      const statuts = await request.get(`${API}/repartition/revalidation/statuts?versionId=v1`);
      expect(statuts.status()).toBe(401);
    });

    test('POST /versions/:id/transition retourne 401', async ({ request }) => {
      const transition = await request.post(`${API}/versions/v1/transition`, {
        data: { action: 'validerDefinitivement' },
      });
      expect(transition.status()).toBe(401);
    });

    test('GET /exports retourne 401 (endpoint L10 absent)', async ({ request }) => {
      const exports = await request.get(`${API}/exports`);
      expect(exports.status()).toBe(401);
    });
  });

  test.describe('Parcours UF-DIR-01 — Direction valide un scénario', () => {
    test('accède à la liste des scénarios après authentification', async ({ page }) => {
      // Connexion en tant que direction
      await page.goto('/login', { waitUntil: 'networkidle' });
      await page.fill('input[type="email"]', 'direction@example.fr');
      await page.fill('input[type="password"]', 'motdepasse');
      await page.click('button:has-text("Se connecter")');
      await expect(page).toHaveURL(/\/dir\/scenario/);

      // Un sélecteur de version est présent
      await expect(page.locator('#selecteur-version')).toBeVisible();
    });
  });
});
