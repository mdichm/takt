// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { expect, test } from '@playwright/test';

test('le formulaire de connexion s\xe9affiche et le bouton se d\xe9sactive quand le formulaire est invalide', async ({
  page,
}) => {
  const reponse = await page.goto('/login', { waitUntil: 'networkidle' });
  expect(reponse?.status()).toBe(200);

  const email = page.getByRole('textbox', { name: /adresse e-mail/i });
  const motDePasse = page.getByRole('textbox', { name: /mot de passe/i });
  const bouton = page.getByRole('button', { name: /se connecter/i });

  await expect(email).toBeVisible();
  await expect(motDePasse).toBeVisible();
  await expect(bouton).toBeDisabled();

  // Remplissage des champs : le bouton devient actif.
  await email.fill('alice@takt.fr');
  await motDePasse.fill('motdepasse123');
  await expect(bouton).not.toBeDisabled();
});

test('le pied de page affiche la version et le lien RGPD', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await expect(page.getByText(/TAKT v0\.1/)).toBeVisible();
  await expect(page.getByRole('link', { name: /mentions RGPD/i })).toBeVisible();
});
