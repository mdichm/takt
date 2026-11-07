// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb — accessibilité', () => {
  it('ne produit aucune violation axe', async () => {
    const { container } = render(
      <Breadcrumb items={[{ libelle: 'Accueil', url: '/' }, { libelle: 'Courant' }]} />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
