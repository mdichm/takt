// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Tabs } from './Tabs';

describe('Tabs — accessibilité', () => {
  it('ne produit aucune violation axe', async () => {
    const { container } = render(
      <Tabs
        onglets={[
          { id: 'a', libelle: 'A' },
          { id: 'b', libelle: 'B' },
        ]}
        valeur="a"
        onChange={() => {}}
      />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
