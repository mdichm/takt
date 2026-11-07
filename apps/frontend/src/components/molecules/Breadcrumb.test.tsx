// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  const items = [
    { libelle: 'Accueil', url: '/' },
    { libelle: 'Emplois du temps', url: '/edt' },
    { libelle: 'Semaine 12' },
  ];

  it('rend un fil d\'ariane avec role navigation', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation', { name: "Fil d'ariane" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByText('Semaine 12')).toBeInTheDocument();
  });

  it('marque la page courante avec aria-current', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Semaine 12')).toHaveAttribute('aria-current', 'page');
  });
});
