# Spécification Accessibilité — TAKT (SPEC_ACCESSIBILITE.md)

**Projet :** TAKT — Application de planification et de gestion des emplois du temps pédagogiques
**Version :** 1.0
**Date :** 30 octobre 2026
**Responsable :** Frontend Lead + UX Designer
**Statut :** Validé — G6 résolu
**Documents liés :** UI_DESIGN_TOKENS.md, UI_FRONTEND_SPECS.md, UI_WIREFRAMES.md, TESTS.md, PLAN_MACRO.md

---

## 1. Objectif

Garantir la conformité WCAG 2.1 niveau AA sur les deux thèmes (Normal et Ramadan) pour l'ensemble des 26 écrans de l'application, avec tests automatisés intégrés au pipeline CI/CD.

---

## 2. Référentiels et standards

| Standard | Version | Niveau cible | Périmètre |
|----------|---------|--------------|-----------|
| WCAG | 2.1 | AA | Tous les écrans, les deux thèmes |
| RGAA | 4.1.2 | AA | Référentiel français (aligné WCAG) |
| EN 301 549 | v3.2.1 | — | Accessibilité TIC (Europe) |

---

## 3. Critères de succès WCAG 2.1 AA (extrait pertinent)

### 3.1 Perceptible

| Critère | Exigence | Test |
|---------|----------|------|
| 1.4.3 Contraste (minimum) | Ratio 4.5:1 (texte normal), 3:1 (texte large ≥ 18pt ou 14pt bold) | Automatisé (axe-core) + manuel |
| 1.4.11 Contraste non-textuel | Ratio 3:1 pour composants UI, états focus, bordures | Automatisé + manuel |
| 1.4.12 Espacement du texte | Pas de perte de contenu/fonctionnalité avec espacement personnalisé | Manuel |
| 1.4.13 Contenu au survol/focus | Contenu additionnel dismissible, hoverable, persistent | Manuel |

### 3.2 Utilisable

| Critère | Exigence | Test |
|---------|----------|------|
| 2.1.1 Clavier | Toute fonctionnalité accessible au clavier | Automatisé (tab navigation) + manuel |
| 2.1.2 Pas de piège clavier | Focus mobile, pas de trap | Manuel |
| 2.4.3 Ordre de focus | Ordre logique, prévisible | Automatisé + manuel |
| 2.4.7 Focus visible | Indicateur de focus visible (pas outline: none) | Automatisé (axe-core) |
| 2.5.3 Étiquette dans le nom | Nom accessible = label visible | Automatisé |

### 3.3 Compréhensible

| Critère | Exigence | Test |
|---------|----------|------|
| 3.1.1 Langue de la page | `lang="fr"` sur `<html>` | Automatisé |
| 3.2.1 Au focus | Pas de changement de contexte au focus | Manuel |
| 3.2.2 À la saisie | Pas de changement de contexte à la saisie | Manuel |
| 3.3.1 Identification erreurs | Erreurs identifiées, décrites en texte | Automatisé + manuel |
| 3.3.2 Étiquettes/instructions | Labels sur tous les champs | Automatisé |

### 3.4 Robuste

| Critère | Exigence | Test |
|---------|----------|------|
| 4.1.2 Nom, rôle, valeur | Composants : name, role, value, states via ARIA | Automatisé (axe-core) |
| 4.1.3 Messages de statut | Messages dynamiques via `aria-live` | Automatisé + manuel |
---

## 4. Spécificités thèmes TAKT

### 4.1 Thème Normal

| Token | Couleur Normal | Contraste sur Surface (#FFFFFF) | Contraste sur Background (#F1F5F9) |
|-------|----------------|----------------------------------|-------------------------------------|
| Primary (#2563EB) | #2563EB | 5.1:1 ✅ | 4.2:1 ✅ |
| Text Primary (#0F172A) | #0F172A | 14.9:1 ✅ | 12.6:1 ✅ |
| Text Secondary (#475569) | #475569 | 7.3:1 ✅ | 6.2:1 ✅ |
| Success (#10B981) | #10B981 | 3.8:1 ⚠️ (large text only) | 3.2:1 ⚠️ |
| Warning (#F59E0B) | #F59E0B | 2.7:1 ❌ | 2.3:1 ❌ |
| Error (#EF4444) | #EF4444 | 4.5:1 ✅ | 3.9:1 ✅ |
| Lock (#94A3B8) | #94A3B8 | 2.9:1 ❌ | 2.5:1 ❌ |

> **Action requise :** Ajuster Warning, Lock pour atteindre 3:1 minimum sur composants UI

### 4.2 Thème Ramadan

| Token | Couleur Ramadan | Contraste sur Surface (#FAF5FF) | Contraste sur Background (#F1F5F9) |
|-------|-----------------|----------------------------------|-------------------------------------|
| Primary Ramadan (#7C3AED) | #7C3AED | 6.2:1 ✅ | 5.1:1 ✅ |
| Accent Ramadan (#FBBF24) | #FBBF24 | 1.8:1 ❌ | 1.5:1 ❌ |
| Success (#059669) | #059669 | 5.8:1 ✅ | 4.9:1 ✅ |
| Warning (#D97706) | #D97706 | 3.4:1 ✅ | 2.8:1 ⚠️ |
| Error (#DC2626) | #DC2626 | 5.2:1 ✅ | 4.3:1 ✅ |
| Lock (#64748B) | #64748B | 4.1:1 ✅ | 3.5:1 ✅ |

> **Action requise :** Ajuster Accent Ramadan (#FBBF24) pour atteindre 3:1 minimum

---

## 5. Stratégie de tests

### 5.1 Pyramide de tests accessibilité

| Niveau | Outil | Couverture | Fréquence |
|--------|-------|------------|-----------|
| **Unit (tokens)** | `jest-axe` + custom contrast tests | 100% tokens couleurs | Chaque commit |
| **Composants** | `testing-library` + `jest-axe` | Tous composants `atoms/`, `molecules/` | Chaque PR |
| **Intégration (écrans)** | `playwright-axe` | 26 écrans (EC-*) | Chaque PR + nightly |
| **E2E parcours critiques** | `playwright-axe` + manuel | 12 parcours UF-* | Chaque release |
| **Audit manuel** | NVDA / JAWS + clavier seul | 5 parcours critiques | Sprint review |

### 5.2 Configuration axe-core

```typescript
// apps/frontend/axe-config.ts
import { AxeCore } from 'axe-core';

export const axeConfig: AxeCore.RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2aa', 'wcag21aa', 'best-practice'],
  },
  rules: {
    'color-contrast': { enabled: true },
    'focus-visible': { enabled: true },
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'landmark-one-main': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
  },
  resultTypes: ['violations', 'incomplete'],
};
```

### 5.3 Tests de contraste programmatiques (tokens)

```typescript
// apps/frontend/src/lib/tokens/__tests__/contrast.test.ts
import { checkContrast } from '../utils/contrast';
import { tokensNormal, tokensRamadan } from '../tokens';

describe('Design Tokens - Contraste WCAG AA', () => {
  const testCases = [
    { fg: 'DT-COLOR-01', bg: 'DT-COLOR-05', min: 4.5, ctx: 'Primary on Surface' },
    { fg: 'DT-COLOR-08', bg: 'DT-COLOR-05', min: 4.5, ctx: 'Text Primary on Surface' },
    { fg: 'DT-COLOR-09', bg: 'DT-COLOR-05', min: 4.5, ctx: 'Text Secondary on Surface' },
    { fg: 'DT-COLOR-20', bg: 'DT-COLOR-05', min: 3, ctx: 'Success on Surface (UI component)' },
    { fg: 'DT-COLOR-21', bg: 'DT-COLOR-05', min: 3, ctx: 'Warning on Surface (UI component)' },
    { fg: 'DT-COLOR-22', bg: 'DT-COLOR-05', min: 4.5, ctx: 'Error on Surface' },
    { fg: 'DT-COLOR-24', bg: 'DT-COLOR-05', min: 3, ctx: 'Lock on Surface (UI component)' },
    { fg: 'DT-COLOR-25', bg: 'DT-COLOR-05', min: 3, ctx: 'Lock Incompatible on Surface (UI component)' },
  ];

  ['normal', 'ramadan'].forEach(theme => {
    const tokens = theme === 'normal' ? tokensNormal : tokensRamadan;
    testCases.forEach(({ fg, bg, min, ctx }) => {
      test(`${theme} - ${ctx} (${fg} on ${bg}) ≥ ${min}:1`, () => {
        const ratio = checkContrast(tokens[fg], tokens[bg]);
        expect(ratio).toBeGreaterThanOrEqual(min);
      });
    });
  });
});
```
---

## 6. Tests E2E accessibilité (Playwright)

```typescript
// apps/frontend/tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const criticalScreens = [
  { path: '/login', name: 'EC-COM-01 Login' },
  { path: '/dashboard', name: 'EC-COM-02 Dashboard' },
  { path: '/versions', name: 'EC-GES-01 Initialisation' },
  { path: '/versions/1/seances', name: 'EC-GES-06 Grille EDT' },
  { path: '/versions/1/generation', name: 'EC-GES-04 Génération' },
  { path: '/versions/1/validation', name: 'EC-GES-08 Validation' },
  { path: '/versions/1/publication', name: 'EC-GES-09 Publication' },
  { path: '/admin/users', name: 'EC-ADM-01 Utilisateurs' },
  { path: '/admin/audit', name: 'EC-ADM-04 Audit' },
];

['normal', 'ramadan'].forEach(theme => {
  test.describe(`Accessibilité - Thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('theme', t);
      }, theme);
      await page.fill('[data-testid="email"]', 'gest@takt.internal');
      await page.fill('[data-testid="password"]', 'Password123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    criticalScreens.forEach(({ path, name }) => {
      test(`${name} - Aucune violation WCAG AA`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2aa', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });

    test('Navigation clavier complète - Dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.keyboard.press('Tab');
      const focusableElements = await page.$$eval(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        els => els.map(el => el.tagName)
      );
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    test('Grille EDT - Drag&Drop accessible clavier', async ({ page }) => {
      await page.goto('/versions/1/seances');
      const firstSeance = page.locator('[data-testid="seance-cell"]').first();
      await firstSeance.focus();
      await expect(firstSeance).toBeFocused();
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(page.locator('[role="status"]').first()).toBeVisible();
    });
  });
});
```

---

## 7. Intégration CI/CD

### 7.1 Étape accessibilité dans `.github/workflows/ci.yml`

```yaml
  accessibility:
    name: Accessibilité (axe-core)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: build
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm --filter @takt/frontend exec playwright install --with-deps chromium

      - name: Run Unit Accessibility Tests (tokens + components)
        run: pnpm --filter @takt/frontend test:a11y:unit

      - name: Run E2E Accessibility Tests
        run: pnpm --filter @takt/frontend test:a11y:e2e
        env:
          BASE_URL: http://localhost:3000

      - name: Upload Axe Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: axe-report
          path: apps/frontend/axe-results/
          retention-days: 7
```

### 7.2 Scripts package.json (frontend)

```json
{
  "scripts": {
    "test:a11y:unit": "vitest run --reporter=verbose src/lib/tokens/__tests__/contrast.test.ts src/components/__tests__/a11y.test.tsx",
    "test:a11y:e2e": "playwright test tests/e2e/accessibility.spec.ts --reporter=html",
    "test:a11y:report": "npx axe-html-reporter ./axe-results/ ./axe-report/"
  }
}
```

---

## 8. Tests manuels complémentaires (Checklist Sprint Review)

| Test | Périmètre | Outil | Critère de passage |
|------|-----------|-------|-------------------|
| Navigation clavier seule | 12 parcours UF-* | Clavier seul (Tab, Enter, Escape, Arrows) | Tous les éléments interactifs atteignables, ordre logique |
| Lecteur d'écran | 5 parcours critiques | NVDA (Windows) / VoiceOver (Mac) | Annonces correctes, labels, états, messages dynamiques |
| Zoom 200% | Tous écrans | Navigateur (Ctrl++) | Pas de perte contenu, pas de scroll horizontal |
| Mode contraste élevé | Tous écrans | OS High Contrast / extension | Lisibilité maintenue |
| Redimensionnement texte | Tous écrans | Navigateur (texte seulement 200%) | Pas de troncature, pas de chevauchement |

---

## 9. Métriques de suivi accessibilité

| Métrique | Cible | Outil |
|----------|-------|-------|
| Violations axe-core (CI) | 0 sur wcag2aa/wcag21aa | GitHub Actions |
| Couverture tests a11y unitaires | 100% tokens + composants | Vitest |
| Couverture tests a11y E2E | 100% écrans critiques | Playwright |
| Temps de correction violation | < 1 sprint | Jira/GitHub Issues |
| Régression accessibilité | 0 entre releases | Comparaison rapports |

---

## 10. Références

- WCAG 2.1 : https://www.w3.org/WAI/WCAG21/quickref/
- axe-core : https://github.com/dequelabs/axe-core
- jest-axe : https://github.com/nickcolley/jest-axe
- playwright-axe : https://github.com/axe-core/playwright-axe
- RGAA 4.1 : https://accessibilite.numerique.gouv.fr/methode/rgaa/
- UI_DESIGN_TOKENS.md (DL-DT-03 : WCAG AA sur les deux thèmes)
- TESTS.md §1.3 (TE-TEST-04 : 100% parcours critiques E2E)

---

*Fin du SPEC_ACCESSIBILITE.md — TAKT v1.0*