// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { DataTableRow } from './DataTableRow';

describe('DataTableRow — accessibilité', () => {
  it('ne produit aucune violation axe', async () => {
    const { container } = render(
      <table role="grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <DataTableRow cellules={[{ libelle: 'Nom', valeur: 'Alice' }]} />
      </table>,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
