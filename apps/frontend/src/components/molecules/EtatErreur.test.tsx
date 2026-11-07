// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EtatErreur } from './EtatErreur';

describe('EtatErreur', () => {
  it('rend une alerte avec role alert', () => {
    render(<EtatErreur message="Erreur de chargement" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erreur de chargement');
  });

  it('affiche le titre quand fourni', () => {
    render(<EtatErreur message="Erreur" titre="Échec" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Échec');
  });

  it('appelle onReessayer quand on clique sur le bouton', () => {
    const onReessayer = vi.fn();
    render(<EtatErreur message="Erreur" onReessayer={onReessayer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onReessayer).toHaveBeenCalledTimes(1);
  });
});
