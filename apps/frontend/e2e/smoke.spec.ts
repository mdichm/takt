import { test, expect } from '@playwright/test';

/**
 * Test E2E de fumée — vérifie que le frontend TAKT se charge correctement.
 */
test("la page d'accueil se charge", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('TAKT');
});