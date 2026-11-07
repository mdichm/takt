// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Icone } from './Icone';

describe('Icone — accessibilité', () => {
  it('icône décorative ne produit aucune violation axe', async () => {
    const { container } = render(<Icone nom="accueil" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('icône avec aria-label ne produit aucune violation axe', async () => {
    render(<Icone nom="fermer" ariaLabel="Fermer" />);
    const img = screen.getByRole('img', { name: 'Fermer' });
    await expectAccessible(img);
  });
});
