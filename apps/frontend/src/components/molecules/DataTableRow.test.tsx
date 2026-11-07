// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTableRow } from './DataTableRow';

describe('DataTableRow', () => {
  const cellules = [
    { libelle: 'Nom', valeur: 'Alice' },
    { libelle: 'Rôle', valeur: 'Enseignante' },
  ];

  it('rend une ligne de tableau avec cellules', () => {
    render(<DataTableRow cellules={cellules} />);
    expect(screen.getByRole('row')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Enseignante')).toBeInTheDocument();
  });

  it('signale la selection via aria-selected', () => {
    render(<DataTableRow cellules={cellules} selectionnee />);
    expect(screen.getByRole('row')).toHaveAttribute('aria-selected', 'true');
  });

  it('applique le fond variante quand selectionnee', () => {
    render(<DataTableRow cellules={cellules} selectionnee />);
    const row = screen.getByRole('row');
    expect(row.getAttribute('style')).toContain('var(--color-surface-variant)');
  });
});
