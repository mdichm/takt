// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { Bouton } from './Bouton';

describe('Bouton — accessibilité', () => {
  it('ne produit aucune violation axe (primaire)', async () => {
    const { container } = render(<Bouton libelle="Confirmer" />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (en chargement)', async () => {
    const { container } = render(<Bouton libelle="Charger" chargement />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('ne produit aucune violation axe (desactive)', async () => {
    const { container } = render(<Bouton libelle="Desactive" disabled />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });
});
