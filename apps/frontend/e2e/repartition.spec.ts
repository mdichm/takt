// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

test.describe('Répartition pédagogique (TAKT-L05-06)', () => {
  test('page de saisie protégée : redirection vers /login sans session', async ({
    page,
  }) => {
    const reponse = await page.goto('/rdep/allocation', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/);
    expect(reponse?.status()).toBe(200);
  });

  test('page de suivi protégée : redirection vers /login sans session', async ({
    page,
  }) => {
    const reponse = await page.goto('/rdep/charges', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/);
    expect(reponse?.status()).toBe(200);
  });

  test('endpoints API protégés : 401 sans session', async ({ request }) => {
    const plans = await request.get(`${API}/plans-etudes?departementId=d1&semestreId=s1`);
    expect(plans.status()).toBe(401);

    const statuts = await request.get(`${API}/repartition/revalidation/statuts?versionId=v1`);
    expect(statuts.status()).toBe(401);

    const affectations = await request.get(
      `${API}/repartition/affectations?versionId=v1&departementId=d1`,
    );
    expect(affectations.status()).toBe(401);
  });
});