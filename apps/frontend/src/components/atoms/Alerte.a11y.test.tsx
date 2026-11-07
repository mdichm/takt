// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Alerte } from './Alerte';

describe('Alerte — accessibilité', () => {
  it('ne produit aucune violation axe (erreur)', async () => {
    const { container } = render(<Alerte variante="erreur" message="Erreur" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (succès, fermable)', async () => {
    const { container } = render(
      <Alerte variante="succès" message="Enregistré" fermable onFermer={() => {}} />,
    );
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
