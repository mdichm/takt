// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShowcaseDesignSystem } from './ShowcaseDesignSystem';

describe('ShowcaseDesignSystem', () => {
  it('rend le titre principal', () => {
    render(<ShowcaseDesignSystem />);
    expect(screen.getByText('Design System TAKT')).toBeInTheDocument();
  });

  it('rend les atomes (boutons, inputs, badges)', () => {
    render(<ShowcaseDesignSystem />);
    expect(screen.getByRole('button', { name: 'Primaire' })).toBeInTheDocument();
    expect(screen.getByLabelText('Texte')).toBeInTheDocument();
    expect(screen.getByText('Succès')).toBeInTheDocument();
  });

  it('rend les molécules (formfield, searchbar, paginator, tabs)', () => {
    render(<ShowcaseDesignSystem />);
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('rend les états (vide, chargement, erreur)', () => {
    render(<ShowcaseDesignSystem />);
    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Chargement en cours…' })).toBeInTheDocument();
    expect(screen.getAllByText('Erreur').length).toBeGreaterThan(0);
  });

  it('ouvre et ferme la modal', () => {
    render(<ShowcaseDesignSystem />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir modal' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});