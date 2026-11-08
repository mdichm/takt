// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Configuration axe-core conforme à SPEC_ACCESSIBILITE §5.2.
 * Tags WCAG 2.1 AA + best-practice, 12 règles ciblées,
 * résultats 'violations' et 'incomplete'.
 */
export const axeConfig: {
  runOnly: { type: 'tag'; values: string[] };
  rules: Record<string, { enabled: boolean }>;
  resultTypes: string[];
} = {
  runOnly: {
    type: 'tag',
    values: ['wcag2aa', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // color-contrast est désactivé : inopérant dans jsdom (pas de styles CSS calculés).
    // Le contraste est couvert par packages/design-tokens (L08-01, contraste.test.ts).
    'color-contrast': { enabled: false },
    label: { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'landmark-one-main': { enabled: true },
    region: { enabled: true },
    'skip-link': { enabled: true },
  },
  resultTypes: ['violations', 'incomplete'],
};
