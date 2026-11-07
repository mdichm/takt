// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Select } from './Select';

describe('Select — accessibilité', () => {
  const options = [
    { valeur: 'a', libelle: 'Option A' },
    { valeur: 'b', libelle: 'Option B' },
  ];

  it('ne produit aucune violation axe', async () => {
    const { container } = render(<Select label="Choix" options={options} />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (erreur)', async () => {
    const { container } = render(<Select label="Choix" options={options} messageErreur="Requis" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
