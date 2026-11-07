// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('rend un indicateur de statut avec libellé', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Chargement en cours' })).toBeInTheDocument();
  });

  it('applique le libellé personnalisé', () => {
    render(<Spinner ariaLabel="Chargement des séances" />);
    expect(screen.getByRole('status', { name: 'Chargement des séances' })).toBeInTheDocument();
  });

  it('applique la taille demandée', () => {
    render(<Spinner taille={40} />);
    const status = screen.getByRole('status');
    expect(status).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('masque le libellé visuellement mais le garde accessible', () => {
    render(<Spinner />);
    const libelle = screen.getByText('Chargement en cours');
    expect(libelle).toHaveStyle({ position: 'absolute' });
  });
});
