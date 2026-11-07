// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PanneauConflits } from './PanneauConflits';

describe('PanneauConflits', () => {
  const conflits = [
    { id: 'c1', type: 'salle' as const, entiteA: 'Salle A101', entiteB: 'Salle A101', seance: 'Lundi 08h', gravite: 'bloquant' as const },
    { id: 'c2', type: 'enseignant' as const, entiteA: 'M. Dupont', entiteB: 'Mme Martin', seance: 'Mardi 10h', gravite: 'warning' as const },
  ];

  it('rend la liste des conflits', () => {
    const onResolver = vi.fn();
    render(<PanneauConflits conflits={conflits} onResolver={onResolver} />);
    expect(screen.getByText('2 conflits détectés')).toBeInTheDocument();
    expect(screen.getByText('Salle : Salle A101 ↔ Salle A101')).toBeInTheDocument();
    expect(screen.getByText('Enseignant : M. Dupont ↔ Mme Martin')).toBeInTheDocument();
  });

  it('appelle onResolver quand on clique sur Résoudre', () => {
    const onResolver = vi.fn();
    render(<PanneauConflits conflits={conflits} onResolver={onResolver} />);
    const boutons = screen.getAllByRole('button', { name: 'Résoudre' });
    expect(boutons.length).toBeGreaterThan(0);
    fireEvent.click(boutons[0]!);
    expect(onResolver).toHaveBeenCalledWith('c1');
  });

  it('affiche un badge selon la gravite', () => {
    render(<PanneauConflits conflits={conflits} onResolver={vi.fn()} />);
    expect(screen.getByText('bloquant')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('affiche un message de succès quand il ny a pas de conflit', () => {
    render(<PanneauConflits conflits={[]} onResolver={vi.fn()} />);
    expect(screen.getByText('Aucun conflit')).toBeInTheDocument();
  });

  it('affiche un indicateur de chargement', () => {
    render(<PanneauConflits conflits={[]} onResolver={vi.fn()} chargement />);
    expect(screen.getByLabelText(/Chargement des conflits/)).toBeInTheDocument();
  });
});