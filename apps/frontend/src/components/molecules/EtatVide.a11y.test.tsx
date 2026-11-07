// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { EtatVide } from './EtatVide';

describe('EtatVide — accessibilité', () => {
  it('ne produit aucune violation axe', async () => {
    const { container } = render(<EtatVide message="Aucune donnée." titre="Vide" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
