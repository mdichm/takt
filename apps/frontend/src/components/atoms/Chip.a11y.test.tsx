// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Chip } from './Chip';

describe('Chip — accessibilité', () => {
  it('ne produit aucune violation axe (inactive)', async () => {
    const { container } = render(<Chip libelle="Test" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (active)', async () => {
    const { container } = render(<Chip libelle="Test" active />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (supprimable)', async () => {
    const { container } = render(<Chip libelle="Test" supprimer onSupprimer={() => {}} />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
