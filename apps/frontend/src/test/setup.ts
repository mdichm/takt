// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { axeConfig } from './axe-config';
import * as axeCore from 'axe-core';

const axe: (
  element: Element | Document,
  options?: Record<string, unknown>,
) => Promise<{
  violations: Array<{ help: string; id: string; nodes: Array<Record<string, unknown>> }>;
  incomplete: Array<{ help: string; id: string; nodes: Array<Record<string, unknown>> }>;
}> = axeCore.run;

expect.extend({
  async toHaveNoViolations(received: HTMLElement | null) {
    if (!received) {
      return {
        pass: false,
        message: () => 'expectAccessible: élément DOM manquant (null ou indéfini)',
      };
    }
    const results = await axe(received, axeConfig);
    const pass = results.violations.length === 0 && results.incomplete.length === 0;
    const messages = [
      ...results.violations.map((v) => `• ${v.help} (${v.id}) — ${v.nodes.length} node(s)`),
      ...results.incomplete.map(
        (i) => `• [incomplet] ${i.help} (${i.id}) — ${i.nodes.length} node(s)`,
      ),
    ];
    return {
      pass,
      message: () =>
        pass
          ? 'attendu : aucune violation axe-core, mais aucune trouvée'
          : `Violations d'accessibilité détectées:\n${messages.join('\n')}`,
    };
  },
});

afterEach(() => {
  cleanup();
});
