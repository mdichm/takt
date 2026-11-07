// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Badge } from './Badge';

describe('Badge — accessibilité', () => {
  it('ne produit aucune violation axe pour chaque variante', async () => {
    for (const variante of ['info', 'succès', 'attention', 'erreur'] as const) {
      const { container } = render(<Badge variante={variante} libelle="Test" />);
      await expectAccessible(container.firstElementChild as HTMLElement | null);
    }
  });
});
