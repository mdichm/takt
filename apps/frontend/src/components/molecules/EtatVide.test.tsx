// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EtatVide } from './EtatVide';

describe('EtatVide', () => {
  it('affiche le message avec role status', () => {
    render(<EtatVide message="Aucune donnée." />);
    expect(screen.getByRole('status', { name: 'Aucune donnée.' })).toBeInTheDocument();
  });

  it('affiche le titre et l icone quand fournis', () => {
    render(<EtatVide message="Vide." titre="Aucune séance" icone="calendrier" />);
    expect(screen.getByText('Aucune séance')).toBeInTheDocument();
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
