// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Bouton } from './Bouton';

describe('Bouton', () => {
  it('affiche le libelle dans un bouton', () => {
    render(<Bouton libelle="Confirmer" />);
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();
  });

  it('applique le fond primaire par defaut via jeton CSS', () => {
    render(<Bouton libelle="Confirmer" />);
    const bouton = screen.getByRole('button', { name: 'Confirmer' });
    expect(bouton.getAttribute('style')).toContain('var(--color-primary)');
  });

  it('applique le fond erreur pour la variante danger', () => {
    render(<Bouton variante="danger" libelle="Supprimer" />);
    const bouton = screen.getByRole('button', { name: 'Supprimer' });
    expect(bouton.getAttribute('style')).toContain('var(--color-error)');
  });

  it('desactive le bouton et applique opacity reduite', () => {
    render(<Bouton libelle="Desactive" disabled />);
    const bouton = screen.getByRole('button');
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveStyle({ opacity: 0.6 });
  });

  it('appelle onClick au clic', () => {
    const onClick = vi.fn();
    render(<Bouton libelle="Cliquer" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cliquer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ne appelle pas onClick quand en chargement', () => {
    const onClick = vi.fn();
    render(<Bouton libelle="Charger" chargement onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('signale etat charge via aria-busy', () => {
    render(<Bouton libelle="Charger" chargement />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
