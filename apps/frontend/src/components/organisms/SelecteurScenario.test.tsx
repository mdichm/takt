// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelecteurScenario } from './SelecteurScenario';

describe('SelecteurScenario', () => {
  const scenarios = [
    { id: 's1', nom: 'Scénario A', description: 'Optimisé salles', score: 85, conflits: 2, selected: true },
    { id: 's2', nom: 'Scénario B', description: 'Optimisé enseignants', score: 70, conflits: 5 },
    { id: 's3', nom: 'Scénario C', description: 'Baseline', score: 45, conflits: 12 },
  ];

  it('rend toutes les cartes de scénarios', () => {
    const onSelect = vi.fn();
    render(<SelecteurScenario scenarios={scenarios} onSelect={onSelect} />);
    expect(screen.getByText('Scénario A')).toBeInTheDocument();
    expect(screen.getByText('Scénario B')).toBeInTheDocument();
    expect(screen.getByText('Scénario C')).toBeInTheDocument();
  });

  it('affiche le score et le nombre de conflits', () => {
    render(<SelecteurScenario scenarios={scenarios} onSelect={vi.fn()} />);
    expect(screen.getByText('85 / 100')).toBeInTheDocument();
    expect(screen.getByText('2 conflits')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('appelle onSelect quand on clique sur un scénario', () => {
    const onSelect = vi.fn();
    render(<SelecteurScenario scenarios={scenarios} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Scénario B'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('marque le scénario sélectionné avec aria-checked', () => {
    render(<SelecteurScenario scenarios={scenarios} onSelect={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Scénario A/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('desactive les cartes en chargement', () => {
    render(<SelecteurScenario scenarios={scenarios} onSelect={vi.fn()} chargement />);
    const cartes = screen.getAllByRole('radio');
    cartes.forEach((c) => expect(c).toHaveStyle('cursor: not-allowed'));
  });
});