// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Tooltip } from './Tooltip';

describe('Tooltip — accessibilité', () => {
  it('ne produit aucune violation axe (ferme)', async () => {
    const { container } = render(
      <Tooltip contenu="Aide">
        <button>Declencheur</button>
      </Tooltip>,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (ouverte)', async () => {
    const { container } = render(
      <Tooltip contenu="Aide" ouvert>
        <button>Declencheur</button>
      </Tooltip>,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
