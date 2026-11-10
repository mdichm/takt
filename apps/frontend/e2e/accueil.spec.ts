// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test('la racine redirige vers l écran de connexion pour un utilisateur non authentifié', async ({
  page,
}) => {
  const reponse = await page.goto('/', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);
  // Pas de session : la racine redirige vers le tableau de bord puis vers /login.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Écran EC-COM-01')).toBeVisible();
});
