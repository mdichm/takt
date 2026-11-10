// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { expectAccessible } from '@/test/a11y';
import { PanneauConflits } from './PanneauConflits';

describe('PanneauConflits — accessibilité', () => {
  const conflits = [
    {
      id: 'c1',
      type: 'salle' as const,
      entiteA: 'Salle A101',
      entiteB: 'Salle A101',
      seance: 'Lundi 08h',
      gravite: 'bloquant' as const,
    },
  ];

  it('ne produit aucune violation axe', async () => {
    const { container } = render(<PanneauConflits conflits={conflits} onResolver={vi.fn()} />);
    await expectAccessible(container.firstElementChild as HTMLElement | null);
  });

  it('bouton Resoudre accessible par nom', () => {
    render(<PanneauConflits conflits={conflits} onResolver={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Résoudre' })).toBeInTheDocument();
  });
});
