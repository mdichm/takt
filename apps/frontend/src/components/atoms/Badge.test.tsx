// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('affiche le libelle avec le role status', () => {
    render(<Badge variante="succès" libelle="Actif" />);
    expect(screen.getByRole('status', { name: 'Actif (succès)' })).toBeInTheDocument();
  });

  it('applique la couleur de fond par variante via jeton CSS', () => {
    render(<Badge variante="erreur" libelle="Erreur" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveStyle({ background: 'var(--color-error)' });
  });

  it('utilise le blanc pour le texte', () => {
    render(<Badge variante="info" libelle="Info" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveStyle({ color: 'var(--color-surface)' });
  });
});
