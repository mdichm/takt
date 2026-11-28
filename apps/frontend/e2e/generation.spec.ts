// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

const API = 'http://localhost:3000/api/v1';

test.describe('Generation de scenarios (TAKT-L09-07, EC-GES-04)', () => {
  test('page de generation protegee : redirection vers /login sans session', async ({
    page,
  }) => {
    const reponse = await page.goto('/ges/generate', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/);
    expect(reponse?.status()).toBe(200);
  });

  test('endpoints API de generation proteges : 401 sans session', async ({ request }) => {
    const preconditions = await request.get(
      `${API}/generations/preconditions?versionId=v1`,
    );
    expect(preconditions.status()).toBe(401);

    const lister = await request.get(`${API}/generations?versionId=v1`);
    expect(lister.status()).toBe(401);
  });
});
