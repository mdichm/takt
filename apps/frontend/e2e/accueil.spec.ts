// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test('la page d’accueil présente le titre TAKT', async ({ page }) => {
  const reponse = await page.goto('/');

  expect(reponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'TAKT' })).toBeVisible();
  await expect(page.getByText('Planification des emplois du temps pédagogiques')).toBeVisible();
});
