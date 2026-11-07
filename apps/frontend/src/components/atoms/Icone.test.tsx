// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icone } from './Icone';

describe('Icone', () => {
  it('rend une icône SVG avec le bon viewBox', () => {
    render(<Icone nom="accueil" />);
    // fallback: query direct du SVG
    const svgEl = document.querySelector('svg');
    expect(svgEl).not.toBeNull();
    expect(svgEl?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svgEl).toHaveAttribute('aria-hidden', 'true');
  });

  it('est masquée aux lecteurs d\'écran par défaut', () => {
    render(<Icone nom="accueil" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('expose un aria-label quand fourni (visible dans l\'arbre d\'accessibilite)', () => {
    render(<Icone nom="fermer" ariaLabel="Fermer la modal" />);
    expect(screen.getByRole('img', { name: 'Fermer la modal' })).toBeInTheDocument();
    expect(document.querySelector('svg')).not.toHaveAttribute('aria-hidden');
  });

  it('applique la taille demandee', () => {
    render(<Icone nom="accueil" taille={32} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });
});
