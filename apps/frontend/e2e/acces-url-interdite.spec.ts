// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test('un utilisateur non authentifié ne peut pas accéder à une URL protégée (admin)', async ({ page }) => {
  const reponse = await page.goto('/admin/users', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);
  // L écran admin est protégé : redirection vers /login (pas de session).
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Écran EC-COM-01')).toBeVisible();
  await expect(page.getByText('Écran EC-ADM-01')).not.toBeVisible();
});

test('un utilisateur non authentifié ne peut pas accéder à une URL gest', async ({ page }) => {
  const reponse = await page.goto('/ges/init', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);
});

test('un utilisateur non authentifié ne peut pas accéder à une URL rdep', async ({ page }) => {
  const reponse = await page.goto('/rdep/allocation', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);
});

test('un utilisateur non authentifié ne peut pas accéder à une URL dir', async ({ page }) => {
  const reponse = await page.goto('/dir/scenario', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login/);
});
