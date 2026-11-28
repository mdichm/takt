// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarreProgression } from './BarreProgression';

describe('BarreProgression', () => {
  it('affiche une barre de progression avec role progressbar et aria-valuenow', () => {
    render(<BarreProgression valeur={45} libelle="Progression de la génération" />);
    const barre = screen.getByRole('progressbar');
    expect(barre).toBeInTheDocument();
    expect(barre).toHaveAttribute('aria-valuenow', '45');
    expect(barre).toHaveAttribute('aria-valuemin', '0');
    expect(barre).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('Progression de la génération')).toBeInTheDocument();
  });

  it('clamp la valeur à 100 quand elle dépasse', () => {
    render(<BarreProgression valeur={150} libelle="Test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamp la valeur à 0 quand elle est négative', () => {
    render(<BarreProgression valeur={-10} libelle="Test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('affiche le pourcentage texte', () => {
    render(<BarreProgression valeur={75} libelle="Test" />);
    expect(screen.getAllByText('75 %').length).toBeGreaterThan(0);
  });

  it('utilise le libelle par defaut', () => {
    render(<BarreProgression valeur={30} />);
    expect(screen.getByText('Progression')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
  });

  it('affiche un message optionnel', () => {
    render(<BarreProgression valeur={50} libelle="Test" message="Etape 2 sur 6" />);
    expect(screen.getByText('Etape 2 sur 6')).toBeInTheDocument();
  });
});
