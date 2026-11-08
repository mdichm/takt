// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { ShowcaseDesignSystem } from './ShowcaseDesignSystem';

describe('ShowcaseDesignSystem — accessibilité', () => {
  it('ne produit aucune violation axe sur la page complète', async () => {
    const { container } = render(<ShowcaseDesignSystem />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('modal accessible quand ouverte', async () => {
    const { container } = render(<ShowcaseDesignSystem />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir modal' }));
    const dialog = screen.getByRole('dialog');
    await expectAccessible(dialog);
    void container;
  });
});
