// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { PageAccueil } from './PageAccueil';

describe('PageAccueil — accessibilité', () => {
  it('ne produit aucune violation axe-core sur l’écran complet', async () => {
    render(<PageAccueil />);
    const main = screen.getByRole('main');
    await expectAccessible(main);
  });
});
