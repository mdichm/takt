// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('affiche le libelle dans un bouton', () => {
    render(<Chip libelle="Actif" />);
    expect(screen.getByRole('button', { name: 'Actif' })).toBeInTheDocument();
  });

  it('reflete l etat active via aria-pressed', () => {
    render(<Chip libelle="Actif" active />);
    expect(screen.getByRole('button', { name: 'Actif' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('appelle onClick au clic', () => {
    const onClick = vi.fn();
    render(<Chip libelle="Actif" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Actif' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('appelle onSupprimer et arrete la propagation quand supprimer est actif', () => {
    const onSupprimer = vi.fn();
    const onClick = vi.fn();
    render(<Chip libelle="Actif" supprimer onSupprimer={onSupprimer} onClick={onClick} />);
    const supprimer = screen.getByLabelText('Supprimer');
    fireEvent.click(supprimer);
    expect(onSupprimer).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('utilise le fond primaire quand active', () => {
    render(<Chip libelle="Actif" active />);
    const chip = screen.getByRole('button', { name: 'Actif' });
    expect(chip).toHaveStyle({ background: 'var(--color-primary)' });
  });
});
