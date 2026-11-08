// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alerte } from './Alerte';

describe('Alerte', () => {
  it('rend une alerte avec role alert', () => {
    render(<Alerte variante="erreur" message="Conflit de salle" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Conflit de salle');
  });

  it('applique la couleur de bordure par variante via jeton CSS', () => {
    render(<Alerte variante="succès" message="Enregistré" />);
    const alerte = screen.getByRole('alert');
    expect(alerte.getAttribute('style')).toContain('var(--color-success)');
  });

  it('affiche le titre quand fourni', () => {
    render(<Alerte variante="info" titre="Information" message="Détail" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Information');
    expect(screen.getByRole('alert')).toHaveTextContent('Détail');
  });

  it('ferme l alerte quand on clique sur le bouton fermer', () => {
    const onFermer = vi.fn();
    render(<Alerte variante="erreur" message="Erreur" fermable onFermer={onFermer} />);
    fireEvent.click(screen.getByLabelText("Fermer l'alerte"));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });
});
